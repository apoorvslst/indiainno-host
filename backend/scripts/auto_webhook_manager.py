#!/usr/bin/env python3

"""
Auto Webhook Manager (Python Version)

This script:
1. Starts ngrok tunnel
2. Monitors for URL changes
3. Updates .env files
4. Updates Twilio webhook
5. Updates Exotel webhook

Usage:
    python auto_webhook_manager.py
    
Or with specific port:
    python auto_webhook_manager.py --port 3000

Requirements:
    pip install requests python-dotenv

Environment variables (can be in .env file):
    - TWILIO_ACCOUNT_SID
    - TWILIO_AUTH_TOKEN
    - TWILIO_PHONE_NUMBER
    - EXOTEL_SID
    - EXOTEL_TOKEN
    - EXOTEL_APP_ID
    - EXOTEL_WEBHOOK_NUMBER
    - SLACK_WEBHOOK_URL (optional)
"""

import os
import sys
import time
import json
import signal
import subprocess
import argparse
import requests
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import requests
except ImportError:
    print("Please install requests: pip install requests")
    sys.exit(1)

CONFIG = {
    'ngrok_port': 3000,
    'ngrok_region': 'in',
    'check_interval': 15,
    'ngrok_api_url': 'http://127.0.0.1:4040/api/tunnels'
}

COLORS = {
    'reset': '\033[0m',
    'green': '\033[32m',
    'red': '\033[31m',
    'yellow': '\033[33m',
    'blue': '\033[34m',
    'cyan': '\033[36m'
}

class WebhookManager:
    def __init__(self, port=3000, region='in'):
        self.ngrok_port = port
        self.ngrok_region = region
        self.current_url = None
        self.ngrok_process = None
        self.running = False
        
    def log(self, msg, color='reset'):
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"{COLORS['cyan']}[{timestamp}]{COLORS['reset']} {COLORS[color]}{msg}{COLORS['reset']}")
        
    def check_ngrok_running(self):
        """Check if ngrok is already running"""
        try:
            response = requests.get(CONFIG['ngrok_api_url'], timeout=2)
            return response.json()
        except:
            return None
            
    def start_ngrok(self):
        """Start ngrok tunnel"""
        self.log("Starting ngrok tunnel...", 'blue')
        
        try:
            self.ngrok_process = subprocess.Popen(
                ['ngrok', 'http', '--region', self.ngrok_region, '--addr', str(self.ngrok_port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            for _ in range(20):
                time.sleep(1.5)
                tunnels = self.check_ngrok_running()
                if tunnels and tunnels.get('tunnels'):
                    self.log("Ngrok started successfully", 'green')
                    return tunnels
                    
            raise Exception("Ngrok failed to start within timeout")
        except FileNotFoundError:
            self.log("ngrok not found. Please install ngrok from https://ngrok.com/download", 'red')
            sys.exit(1)
            
    def get_ngrok_url(self):
        """Get current ngrok HTTPS URL"""
        tunnels = self.check_ngrok_running()
        if not tunnels:
            raise Exception("Ngrok not running")
            
        for tunnel in tunnels.get('tunnels', []):
            if tunnel.get('proto') == 'https':
                return tunnel.get('public_url', '').rstrip('/')
                
        raise Exception("No HTTPS tunnel found")
        
    def update_env_files(self, base_url):
        """Update all .env files with new webhook URLs"""
        
        env_vars = {
            'WEBHOOK_BASE_URL': base_url,
            'VOICE_WEBHOOK': f"{base_url}/api/voice/incoming",
            'SMS_WEBHOOK': f"{base_url}/api/sms/incoming",
            'CALLBACK_URL': f"{base_url}/api/voice/callback",
            'STATUS_CALLBACK': f"{base_url}/api/voice/status"
        }
        
        env_paths = [
            Path(__file__).parent.parent / '.env',
            Path(__file__).parent.parent.parent / '.env',
        ]
        
        for env_path in env_paths:
            if not env_path.exists():
                continue
                
            content = env_path.read_text()
            
            for key, value in env_vars.items():
                lines = content.split('\n')
                found = False
                for i, line in enumerate(lines):
                    if line.strip().startswith(f'{key}='):
                        lines[i] = f'{key}={value}'
                        found = True
                        break
                if not found:
                    lines.append(f'{key}={value}')
                    
                content = '\n'.join(lines)
                env_path.write_text(content)
                self.log(f"Updated .env: {env_path.name}", 'green')
                
    def update_twilio_webhook(self, base_url):
        """Update Twilio phone number webhook"""
        
        twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
        twilio_auth = os.getenv('TWILIO_AUTH_TOKEN')
        twilio_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if not all([twilio_sid, twilio_auth, twilio_number]):
            self.log("Twilio credentials not found, skipping...", 'yellow')
            return {'success': False, 'reason': 'missing_credentials'}
            
        try:
            self.log("Updating Twilio webhook...", 'blue')
            
            auth = (twilio_sid, twilio_auth)
            voice_url = f"{base_url}/api/voice/incoming"
            
            # Get phone numbers
            resp = requests.get(
                f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/IncomingPhoneNumbers.json",
                auth=auth
            )
            numbers = resp.json().get('incoming_phone_numbers', [])
            
            # Find our number
            my_number = None
            for num in numbers:
                if twilio_number in num.get('phone_number', ''):
                    my_number = num
                    break
                    
            if not my_number:
                self.log(f"Twilio number {twilio_number} not found", 'red')
                return {'success': False, 'reason': 'number_not_found'}
                
            # Update webhook
            resp = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/IncomingPhoneNumbers/{my_number['sid']}.json",
                auth=auth,
                data={
                    'voice_url': voice_url,
                    'voice_method': 'POST',
                    'sms_url': f"{base_url}/api/sms/incoming",
                    'sms_method': 'POST'
                }
            )
            
            if resp.status_code in [200, 201]:
                self.log(f"✅ Twilio webhook updated: {voice_url}", 'green')
                return {'success': True, 'url': voice_url}
            else:
                self.log(f"Twilio error: {resp.text}", 'red')
                return {'success': False, 'error': resp.text}
                
        except Exception as e:
            self.log(f"Twilio error: {str(e)}", 'red')
            return {'success': False, 'error': str(e)}
            
    def update_exotel_webhook(self, base_url):
        """Update Exotel app webhook"""
        
        exotel_sid = os.getenv('EXOTEL_SID')
        exotel_token = os.getenv('EXOTEL_TOKEN')
        exotel_app_id = os.getenv('EXOTEL_APP_ID')
        
        if not all([exotel_sid, exotel_token, exotel_app_id]):
            self.log("Exotel credentials not found, skipping...", 'yellow')
            return {'success': False, 'reason': 'missing_credentials'}
            
        try:
            self.log("Updating Exotel webhook...", 'blue')
            
            voice_url = f"{base_url}/api/voice/incoming"
            
            resp = requests.put(
                f"https://api.exotel.com/v1/Accounts/{exotel_sid}/apps/{exotel_app_id}",
                auth=(exotel_sid, exotel_token),
                json={
                    'VoiceCallbackUrl': voice_url,
                    'HangupCallbackUrl': f"{base_url}/api/voice/hangup",
                    'StatusCallbackUrl': f"{base_url}/api/voice/status"
                }
            )
            
            if resp.status_code in [200, 201]:
                self.log(f"✅ Exotel webhook updated: {voice_url}", 'green')
                return {'success': True, 'url': voice_url}
            else:
                self.log(f"Exotel error: {resp.text}", 'red')
                return {'success': False, 'error': resp.text}
                
        except Exception as e:
            self.log(f"Exotel error: {str(e)}", 'red')
            return {'success': False, 'error': str(e)}
            
    def update_exotel_manual(self, base_url):
        """Update Exotel manual portal number webhook"""
        
        exotel_sid = os.getenv('EXOTEL_SID')
        exotel_token = os.getenv('EXOTEL_TOKEN')
        exotel_webhook_number = os.getenv('EXOTEL_WEBHOOK_NUMBER')
        
        if not all([exotel_sid, exotel_token, exotel_webhook_number]):
            self.log("Exotel Manual credentials not found, skipping...", 'yellow')
            return {'success': False, 'reason': 'missing_credentials'}
            
        try:
            self.log("Updating Exotel Manual Number webhook...", 'blue')
            
            voice_url = f"{base_url}/api/voice/incoming"
            
            resp = requests.put(
                f"https://api.exotel.com/v1/Accounts/{exotel_sid}/incomingphonenumbers/{exotel_webhook_number}",
                auth=(exotel_sid, exotel_token),
                json={
                    'VoiceCallbackUrl': voice_url,
                    'HangupCallbackUrl': f"{base_url}/api/voice/hangup"
                }
            )
            
            if resp.status_code in [200, 201]:
                self.log(f"✅ Exotel Manual webhook updated: {voice_url}", 'green')
                return {'success': True, 'url': voice_url}
            else:
                self.log(f"Exotel Manual error: {resp.text}", 'red')
                return {'success': False, 'error': resp.text}
                
        except Exception as e:
            self.log(f"Exotel Manual error: {str(e)}", 'red')
            return {'success': False, 'error': str(e)}
            
    def update_all(self, base_url):
        """Update all webhooks"""
        
        print()
        print("=" * 50)
        self.log(f"Updating all webhooks to: {base_url}", 'blue')
        print("=" * 50)
        
        self.update_env_files(base_url)
        
        results = {
            'twilio': self.update_twilio_webhook(base_url),
            'exotel': self.update_exotel_webhook(base_url),
            'exotel_manual': self.update_exotel_manual(base_url)
        }
        
        print()
        self.log("✅ Webhook update complete!", 'green')
        return results
        
    def monitor(self):
        """Monitor for URL changes"""
        
        if not self.running:
            return
            
        try:
            new_url = self.get_ngrok_url()
            
            if new_url != self.current_url:
                self.log(f"URL changed: {self.current_url} → {new_url}", 'yellow')
                self.current_url = new_url
                self.update_all(new_url)
                
        except Exception as e:
            self.log(f"Monitor error: {str(e)}", 'red')
            
    def run(self):
        """Main run loop"""
        
        print("""
╔════════════════════════════════════════════════════════════╗
║          🌐 Auto Webhook Manager (Python)                  ║
║          Updates ngrok webhooks automatically              ║
╚════════════════════════════════════════════════════════════╝
        """)
        
        try:
            tunnels = self.check_ngrok_running()
            
            if not tunnels or not tunnels.get('tunnels'):
                self.log("Ngrok not running, starting...", 'yellow')
                tunnels = self.start_ngrok()
                
            self.current_url = self.get_ngrok_url()
            self.log(f"Current URL: {self.current_url}", 'green')
            
            self.update_all(self.current_url)
            
            self.log(f"\nMonitoring for URL changes every {CONFIG['check_interval']}s...", 'blue')
            self.log("Press Ctrl+C to stop\n", 'yellow')
            
            self.running = True
            
            while self.running:
                time.sleep(CONFIG['check_interval'])
                self.monitor()
                
        except KeyboardInterrupt:
            self.log("\nShutting down...", 'yellow')
            self.running = False
            if self.ngrok_process:
                self.ngrok_process.terminate()
                
        except Exception as e:
            self.log(f"Fatal error: {str(e)}", 'red')
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Auto Webhook Manager')
    parser.add_argument('--port', type=int, default=3000, help='Port for ngrok tunnel')
    parser.add_argument('--region', type=str, default='in', help='ngrok region (in, us, eu, etc.)')
    parser.add_argument('--interval', type=int, default=15, help='Check interval in seconds')
    
    args = parser.parse_args()
    
    CONFIG['ngrok_port'] = args.port
    CONFIG['ngrok_region'] = args.region
    CONFIG['check_interval'] = args.interval
    
    manager = WebhookManager(port=args.port, region=args.region)
    manager.run()


if __name__ == '__main__':
    main()
