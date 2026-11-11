const metric = {
    size_mode: 'custom',
    case_structure: 'sheet',
    chest_wall_thickness: 4.3,
    chest_drawer_slide_thickness: 4.3,
    perforation_mode: 'individual',
    case_left_perf_enabled: true,
    case_right_perf_enabled: true,
    case_back_perf_enabled: true,
    case_top_perf_enabled: true,
};

const presets = {
    gridfinity: {size_mode: 'gridfinity'},
    solid: {...metric, flatpack_enabled: false},
    panels: {...metric, flatpack_enabled: true},
};

export function starterSettings(defaults, name) {
    return {...structuredClone(defaults), ...presets[name], render_choice: 'everything'};
}

export function matchingStarter(defaults, settings) {
    return Object.keys(presets).find(name => {
        const expected = starterSettings(defaults, name);
        return Object.keys(expected).every(key => JSON.stringify(settings[key]) === JSON.stringify(expected[key]));
    });
}
