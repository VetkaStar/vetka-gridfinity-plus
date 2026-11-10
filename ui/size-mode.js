import {assemblyBottomLift} from './assembly-math.js';
// The same sizing equations as gridfinity_drawer() in the model source.
const gridOnly = [
    'drawer_inner_width', 'drawer_inner_depth', 'drawer_inner_height',
    'drawer_enable_custom_sizes', 'drawer_custom_sizes', 'drawer_clearance',
    'drawer_base', 'drawer_enable_magnet', 'drawer_magnet_size',
    'chest_top_style', 'chest_top_base_plate_enable_magnets', 'chest_top_base_plate_magnet_size',
    'chest_top_base_plate_reduced_wall_height', 'chest_top_base_plate_reduced_wall_taper',
    'chest_bottom_grid', 'chest_leg_clearance', 'magnet_diameter', 'screw_depth',
    'hole_overhang_remedy', 'chest_corner_attachments_only', 'sub_pitch', 'flat_base',
];

export function initSizeModeUi() {
    const summary = document.getElementById('size-mode-summary');
    if (!summary) return;
    function value(name, index = null) {
        const selector = index == null ? '#parameter_' + name : `.customizer[attr-name="${name}"][attr-index="${index}"]`;
        return Number(document.querySelector(selector)?.value);
    }
    function update() {
        const custom = document.getElementById('parameter_size_mode').value === '"custom"';
        for (const node of document.querySelectorAll('[data-size-mode="custom"]')) node.hidden = !custom;
        for (const name of gridOnly) {
            const label = document.querySelector(`label[for="parameter_${name}"]`);
            const group = document.querySelector(`.customizer-group[attr-name="${name}"]`);
            if (label) label.closest('.col-12').hidden = custom;
            if (group) group.closest('.col-12').hidden = custom;
        }
        summary.className = 'alert alert-info mb-2';
        if (!custom) {
            summary.textContent = 'Режим Gridfinity: размеры ящиков задаются в ячейках по 42 мм, высота — в единицах по 7 мм. Тип дна можно выбрать в разделе «Ящик и ручка».';
            return;
        }
        const w = value('chest_outer_width_mm'), d = value('chest_outer_depth_mm'), h = value('chest_outer_height_mm');
        const count = value('drawer_count'), cw = value('chest_wall_thickness'), dw = value('drawer_wall_thickness');
        const configuredSlide = value('chest_drawer_slide_thickness'), slide = configuredSlide === 0 ? cw : configuredSlide;
        const cx = value('chest_clearance', 0), cy = value('chest_clearance', 1), cz = value('chest_clearance', 2);
        const iw = w - 2*cw - 2*cx - 2*dw;
        const id = d - cw - 2*cy - 2*dw;
        const ih = (h - 2*cw - slide*(count-1))/count - 2*cz - dw;
        const all = [w,d,h,count,cw,dw,slide,cx,cy,cz,iw,id,ih];
        if (!all.every(Number.isFinite) || !Number.isInteger(count) || count < 1 || cw <= 0 || dw <= 0 || slide <= 0 || Math.min(cx,cy,cz) < 0 || iw < 8 || id < 8 || ih <= 0) {
            summary.className = 'alert alert-warning mb-2';
            summary.textContent = 'Эти размеры не подходят: проверь количество ящиков, стенки и зазоры. Внутри ящика должно оставаться не менее 8 мм по ширине и глубине и положительная высота.';
            return;
        }
        const fmt = n => n.toLocaleString('ru-RU', {maximumFractionDigits: 3});
        const dimensions = a => a.map(fmt).join(' × ');
        const lift=assemblyBottomLift({size_mode:'custom',flatpack_enabled:document.getElementById('parameter_flatpack_enabled').checked,flatpack_base_mm:value('flatpack_base_mm'),flatpack_belt_mm:value('flatpack_belt_mm')});
        summary.textContent = `Корпус: ${dimensions([w,d,h+lift])} мм.${lift?` Исходная высота ${fmt(h)} мм + опорный слой ${fmt(value('flatpack_base_mm'))} мм + поясок ${fmt(value('flatpack_belt_mm'))} мм.`:''} Каждый ящик снаружи: ${dimensions([iw+2*dw,id+2*dw,ih+dw])} мм, без выступающей ручки. Внутри ящика примерно: ${dimensions([iw,id,ih])} мм. Дно сплошное, толщиной ${fmt(dw)} мм. Зазоры указаны на каждую сторону. Незначительная поправка булевых операций модели — около 0,01 мм.`;
    }
    window.updateSizeModeUi = update;
    document.addEventListener('change', update);
    document.addEventListener('input', update);
    window.addEventListener('load', update);
    window.addEventListener('hashchange', update);
    update();
}
