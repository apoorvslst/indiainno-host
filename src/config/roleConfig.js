/**
 * Role Configuration — Urban/Rural Title Mappings
 * Maps internal role names to display titles based on area mode.
 *
 * Indian Administrative Hierarchy:
 *   Urban: Municipal Corporation / ULB structure
 *   Rural: Panchayati Raj Institution (PRI) / Block-level structure
 */

const ROLE_CONFIG = {
    junior: {
        urban: {
            title: 'Junior Engineer',
            shortTitle: 'Jr. Engineer',
            description: 'Field-level official who resolves civic issues on-site',
        },
        rural: {
            title: 'Gramsevak',
            shortTitle: 'Gramsevak',
            description: 'Village-level development official for on-site work',
        },
    },
    dept_head: {
        urban: {
            title: 'Department Head',
            shortTitle: 'Dept. Head',
            description: 'Manages all junior officials in a specific department within the city',
        },
        rural: {
            title: 'Block Development Officer',
            shortTitle: 'BDO',
            description: 'Manages block-level development and all gramsevaks',
        },
    },
    officer: {
        urban: {
            title: 'Municipal Commissioner',
            shortTitle: 'Commissioner',
            description: 'Head of the Municipal Corporation — oversees all departments',
        },
        rural: {
            title: 'SDM / ZP CEO',
            shortTitle: 'SDM',
            description: 'Sub-Divisional Magistrate / Zilla Parishad CEO — oversees all blocks',
        },
    },
    citizen: {
        urban: { title: 'Citizen', shortTitle: 'Citizen', description: 'Report and track civic issues' },
        rural: { title: 'Citizen', shortTitle: 'Citizen', description: 'Report and track civic issues' },
    },
    // Legacy compat
    user: {
        urban: { title: 'Citizen', shortTitle: 'Citizen', description: 'Report and track civic issues' },
        rural: { title: 'Citizen', shortTitle: 'Citizen', description: 'Report and track civic issues' },
    },
    engineer: {
        urban: { title: 'Junior Engineer', shortTitle: 'Jr. Engineer', description: 'Field-level official' },
        rural: { title: 'Gramsevak', shortTitle: 'Gramsevak', description: 'Village-level development official' },
    },
    admin: {
        urban: { title: 'Municipal Commissioner', shortTitle: 'Commissioner', description: 'Head of Municipal Corp' },
        rural: { title: 'SDM / ZP CEO', shortTitle: 'SDM', description: 'Oversees all blocks' },
    },
};

export function getRoleTitle(role, mode = 'urban') {
    const config = ROLE_CONFIG[role];
    if (!config) return role;
    return config[mode]?.title || config.urban?.title || role;
}

export function getRoleShortTitle(role, mode = 'urban') {
    const config = ROLE_CONFIG[role];
    if (!config) return role;
    return config[mode]?.shortTitle || config.urban?.shortTitle || role;
}

export function getRoleDescription(role, mode = 'urban') {
    const config = ROLE_CONFIG[role];
    if (!config) return '';
    return config[mode]?.description || config.urban?.description || '';
}

export function isOfficial(role) {
    return ['junior', 'dept_head', 'officer', 'engineer', 'admin'].includes(role);
}

export function normalizeRole(role) {
    if (role === 'engineer') return 'junior';
    if (role === 'admin') return 'officer';
    if (role === 'user') return 'citizen';
    return role;
}

export default ROLE_CONFIG;
