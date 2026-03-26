import os
import requests
from twilio.rest import Client
from dotenv import load_dotenv
import pathlib

env_path = pathlib.Path(__file__).parent / '.env'
load_dotenv(env_path)

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER") or os.getenv("TWILIO_PHONE_NUMBER")

try:
    tunnels = requests.get("http://127.0.0.1:4040/api/tunnels").json()
    public_url = tunnels['tunnels'][0]['public_url'].replace('/', '')
    
    client = Client(TWILIO_SID, TWILIO_AUTH)
    phone = client.incoming_phone_numbers.list(phone_number=TWILIO_NUMBER)[0]
    phone.update(voice_url=f"{public_url}/api/voice/incoming")
    print(f"✅ Updated Twilio webhook to: {public_url}/api/voice/incoming")
except Exception as e:
    print(f"❌ Error: {e}")