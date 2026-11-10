import OpenSCAD from "./openscad-wasm/openscad.js"
import * as THREE from "https://esm.sh/three@0.160.0"
import {GLTFExporter} from "https://esm.sh/three@0.160.0/examples/jsm/exporters/GLTFExporter.js"
import {offMeshToBinaryStl, parseOffMesh} from "./static.34e2cb4f1210/editor/off.js"

console.log("Worker started")

const DEFAULT_TOP_COLOR = new THREE.Color(0x63696f)
const DEFAULT_BOTTOM_COLOR = new THREE.Color(0xc4d0dd)

const MAX_LOG_CHARS = 1024 * 1024
let currentLog = ""
let currentLogTruncated = false

function stringifyLogValue(v) {
    if (v instanceof Error) {
        return v && v.stack ? String(v.stack) : String(v)
    }
    if (typeof v === "string") {
        return v
    }
    if (v === null) {
        return "null"
    }
    if (v === undefined) {
        return "undefined"
    }
    try {
        return JSON.stringify(v)
    } catch (e) {
        return String(v)
    }
}

function appendLogLine(line) {
    if (!line) {
        line = ""
    }
    currentLog += String(line) + "\n"
    if (currentLog.length > MAX_LOG_CHARS) {
        currentLog = currentLog.slice(currentLog.length - MAX_LOG_CHARS)
        if (!currentLogTruncated) {
            currentLogTruncated = true
            currentLog = "[log truncated]\n" + currentLog
        }
    }
}

function logToConsoleAndBuffer(level, ...args) {
    const line = args.map(stringifyLogValue).join(" ")
    appendLogLine(line)
    const fn = console[level] || console.log
    fn.apply(console, args)
}

function logInfo(...args) {
    logToConsoleAndBuffer("log", ...args)
}

function logError(...args) {
    logToConsoleAndBuffer("error", ...args)
}

function formatErrorForMessage(e) {
    if (e instanceof Error) {
        return String(e && e.message ? e.message : e)
    }
    if (typeof e === "string") {
        return e
    }
    if (!e || typeof e !== "object") {
        return String(e)
    }

    const message = typeof e.message === "string" ? e.message.trim() : ""
    if (message) {
        return message
    }
    if (typeof e.name === "string" && e.name) {
        if (typeof e.errno === "number") {
            return `${e.name} (errno ${e.errno})`
        }
        return e.name
    }
    if (typeof e.errno === "number") {
        return `Error (errno ${e.errno})`
    }
    try {
        return JSON.stringify(e)
    } catch (err) {
        return String(e)
    }
}

let runQueue = Promise.resolve()
// OpenSCAD's WASM build aborts its runtime after a render.
// Create a fresh instance for each render.

let cachedInputFiles = null
let preloadAllInputsPromise = null

function getCachedInputFiles() {
    if (cachedInputFiles !== null) {
        return cachedInputFiles
    }
    cachedInputFiles = new Map()
    
    cachedInputFiles.set("/gridfinity_basic_cup.scad", {
        digest: "06980b0e48daead14dd6c00923e21ced2dbbd8c40bac27b5786efc38beb681c6",
        url: `./cas/06980b0e48daead14dd6c00923e21ced2dbbd8c40bac27b5786efc38beb681c6`,
    })
    
    cachedInputFiles.set("/modules/gridfinity_constants.scad", {
        digest: "44ecd1471a3b1550001c78afe81f5c93d2ed28a3cd05520126d7b1e4f557fa69",
        url: `./cas/44ecd1471a3b1550001c78afe81f5c93d2ed28a3cd05520126d7b1e4f557fa69`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_cup.scad", {
        digest: "93e2346f5342a9b5f45380eb7fb7e47174d630b16d7257cf488572153dca1a5b",
        url: `./cas/93e2346f5342a9b5f45380eb7fb7e47174d630b16d7257cf488572153dca1a5b`,
    })
    
    cachedInputFiles.set("/modules/functions_general.scad", {
        digest: "2824b02e5e546b82d87c918e6d4b4ec864addfb16e0b97dc9bf53bb8ac874f43",
        url: `./cas/2824b02e5e546b82d87c918e6d4b4ec864addfb16e0b97dc9bf53bb8ac874f43`,
    })
    
    cachedInputFiles.set("/modules/functions_string.scad", {
        digest: "7c9697c037a0e6f4b4d0f0b8234f3b92ce6128b9ae598ad54df71d6af6fcd420",
        url: `./cas/7c9697c037a0e6f4b4d0f0b8234f3b92ce6128b9ae598ad54df71d6af6fcd420`,
    })
    
    cachedInputFiles.set("/modules/module_patterns.scad", {
        digest: "960265a6f2fef576f015f8b66667e20438491e7011a5208574a516abf48b0cfc",
        url: `./cas/960265a6f2fef576f015f8b66667e20438491e7011a5208574a516abf48b0cfc`,
    })
    
    cachedInputFiles.set("/modules/module_item_holder.scad", {
        digest: "43cc1005e430ac4bb271235d155b88ef21ca96284ede108ae1749785122322b8",
        url: `./cas/43cc1005e430ac4bb271235d155b88ef21ca96284ede108ae1749785122322b8`,
    })
    
    cachedInputFiles.set("/modules/thirdparty/ub_hexgrid.scad", {
        digest: "adf70d47f241cf09b17688e39b21e7f54d35bccfdbbb32a15c17c1d42dbf7142",
        url: `./cas/adf70d47f241cf09b17688e39b21e7f54d35bccfdbbb32a15c17c1d42dbf7142`,
    })
    
    cachedInputFiles.set("/modules/thirdparty/ub_helptxt.scad", {
        digest: "a95aef4cd3d767eb7b4e83430ed0d63983188dcf503c3ae9e2499066261d75ad",
        url: `./cas/a95aef4cd3d767eb7b4e83430ed0d63983188dcf503c3ae9e2499066261d75ad`,
    })
    
    cachedInputFiles.set("/modules/thirdparty/ub_common.scad", {
        digest: "d768d3a7052996eb30d4a66a86afeb558f7c206aa9566fe475f2afa44475d3fc",
        url: `./cas/d768d3a7052996eb30d4a66a86afeb558f7c206aa9566fe475f2afa44475d3fc`,
    })
    
    cachedInputFiles.set("/modules/functions_environment.scad", {
        digest: "deb112e5f8d33e768f7309283507a2b3391f1ba7c4cd655866095a1ff401136d",
        url: `./cas/deb112e5f8d33e768f7309283507a2b3391f1ba7c4cd655866095a1ff401136d`,
    })
    
    cachedInputFiles.set("/modules/functions_gridfinity.scad", {
        digest: "dbe972bba749b088a6c8ef701cf33b55841cb1c67604961a268aa56e5a534820",
        url: `./cas/dbe972bba749b088a6c8ef701cf33b55841cb1c67604961a268aa56e5a534820`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_cup_base.scad", {
        digest: "b393cb63d656267cebaaebbed2cb810078ec9b3bbed5911c8f555abbcbbeeb8b",
        url: `./cas/b393cb63d656267cebaaebbed2cb810078ec9b3bbed5911c8f555abbcbbeeb8b`,
    })
    
    cachedInputFiles.set("/modules/module_magnet.scad", {
        digest: "389b2419fd9b4ffe147ab0b9dc987c2dc9fcd2b7c5fc388b81f96c186a007edd",
        url: `./cas/389b2419fd9b4ffe147ab0b9dc987c2dc9fcd2b7c5fc388b81f96c186a007edd`,
    })
    
    cachedInputFiles.set("/modules/utility/utilities.scad", {
        digest: "785e41a030bd4055b7cec540ff3c7999d04b84af3d8590a0a26c1650092cb71a",
        url: `./cas/785e41a030bd4055b7cec540ff3c7999d04b84af3d8590a0a26c1650092cb71a`,
    })
    
    cachedInputFiles.set("/modules/utility/circle_wavy.scad", {
        digest: "f4033d35b6b2819ef7367edd183c43863102e0f56170879a18878e8493ac003b",
        url: `./cas/f4033d35b6b2819ef7367edd183c43863102e0f56170879a18878e8493ac003b`,
    })
    
    cachedInputFiles.set("/modules/utility/SequentialBridgingDoubleHole.scad", {
        digest: "7d30da9abe84e780e539b3cb8190f2d0659ee67541e1bc236e5b35962a24e971",
        url: `./cas/7d30da9abe84e780e539b3cb8190f2d0659ee67541e1bc236e5b35962a24e971`,
    })
    
    cachedInputFiles.set("/modules/utility/module_utility.scad", {
        digest: "c453d1c35c4c4acf23024b01f1619ce791ceaad517783e93d648b0360fb4ecbd",
        url: `./cas/c453d1c35c4c4acf23024b01f1619ce791ceaad517783e93d648b0360fb4ecbd`,
    })
    
    cachedInputFiles.set("/modules/thirdparty/ub_sbogen.scad", {
        digest: "973f060132cc482db18893db98870d94cf8fa9a0bc4700a8e3cfd069938d3d69",
        url: `./cas/973f060132cc482db18893db98870d94cf8fa9a0bc4700a8e3cfd069938d3d69`,
    })
    
    cachedInputFiles.set("/modules/utility/wallcutout.scad", {
        digest: "3c022fd8783a67e880a9e1fa16a653326e670e2bed970d015e73d46e23794a51",
        url: `./cas/3c022fd8783a67e880a9e1fa16a653326e670e2bed970d015e73d46e23794a51`,
    })
    
    cachedInputFiles.set("/modules/module_wallplacard.scad", {
        digest: "2e50a37521ceed90998b776350478fffc77bb266abe3832be391ac857720312d",
        url: `./cas/2e50a37521ceed90998b776350478fffc77bb266abe3832be391ac857720312d`,
    })
    
    cachedInputFiles.set("/modules/utility/chamfered_shapes.scad", {
        digest: "08073b762fd8ac28454b54ab10502910274f57bd123ef49b2b61c3f48d79a363",
        url: `./cas/08073b762fd8ac28454b54ab10502910274f57bd123ef49b2b61c3f48d79a363`,
    })
    
    cachedInputFiles.set("/modules/module_pattern_voronoi.scad", {
        digest: "cd122336a1c8d025fc546ea0c51e3073b1552857ad78b5c075c59c9ce1aca7ad",
        url: `./cas/cd122336a1c8d025fc546ea0c51e3073b1552857ad78b5c075c59c9ce1aca7ad`,
    })
    
    cachedInputFiles.set("/modules/module_pattern_brick.scad", {
        digest: "81b5a255ae23cada4aa7e39d9ac6cc8bbf8b69a7e16c2cc34b77ef1fbdf24758",
        url: `./cas/81b5a255ae23cada4aa7e39d9ac6cc8bbf8b69a7e16c2cc34b77ef1fbdf24758`,
    })
    
    cachedInputFiles.set("/modules/thridparty/kumikoPatterns/kumiko.scad", {
        digest: "5580bdc8596fd0e3205fa8b4847afa9febf44a9805037f9bb2c16e3d0436c83d",
        url: `./cas/5580bdc8596fd0e3205fa8b4847afa9febf44a9805037f9bb2c16e3d0436c83d`,
    })
    
    cachedInputFiles.set("/modules/module_pattern_kumiko.scad", {
        digest: "0db5fb6bd939b48dae43af667ef065da069373a36d27aa2aa322c793a271be2e",
        url: `./cas/0db5fb6bd939b48dae43af667ef065da069373a36d27aa2aa322c793a271be2e`,
    })
    
    cachedInputFiles.set("/modules/module_pattern_slat.scad", {
        digest: "b6fdeeb8c44c04c61be7b52d637266881f0eb1e08e93d26168e0d253da77f561",
        url: `./cas/b6fdeeb8c44c04c61be7b52d637266881f0eb1e08e93d26168e0d253da77f561`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_label.scad", {
        digest: "98c413368fb0d4ef015df8d8b874356e8ee9f17aa6132210429c6604f8398aaf",
        url: `./cas/98c413368fb0d4ef015df8d8b874356e8ee9f17aa6132210429c6604f8398aaf`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_sliding_lid.scad", {
        digest: "1fcd1e3b992fc183d1ac614e33fa7bbdcac584bcf9c38030c57e3ed28689efa8",
        url: `./cas/1fcd1e3b992fc183d1ac614e33fa7bbdcac584bcf9c38030c57e3ed28689efa8`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_block.scad", {
        digest: "19941ac7d4bb17dd9437504a6d45bdc9dec0563f52be102f91b0a2157b381be3",
        url: `./cas/19941ac7d4bb17dd9437504a6d45bdc9dec0563f52be102f91b0a2157b381be3`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity.scad", {
        digest: "72e8512b08fddb4e15cc146b56085f30446c6011a41eafa15e751eed659fb091",
        url: `./cas/72e8512b08fddb4e15cc146b56085f30446c6011a41eafa15e751eed659fb091`,
    })
    
    cachedInputFiles.set("/modules/module_lip.scad", {
        digest: "22a3605b61ab555e96a36b04fe4d572c00473062b8b7e50bb14fa082e8b0bfde",
        url: `./cas/22a3605b61ab555e96a36b04fe4d572c00473062b8b7e50bb14fa082e8b0bfde`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_frame_connectors.scad", {
        digest: "e7eee9f17b339f50740f15b6885ed524be84f69daa1fdd684b58797ef6e255c1",
        url: `./cas/e7eee9f17b339f50740f15b6885ed524be84f69daa1fdd684b58797ef6e255c1`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_Extendable.scad", {
        digest: "4cbf9bff32586387bcad1eba1f243f33533e66a397043ee82f6898bb2795d6c1",
        url: `./cas/4cbf9bff32586387bcad1eba1f243f33533e66a397043ee82f6898bb2795d6c1`,
    })
    
    cachedInputFiles.set("/modules/module_attachment_clip.scad", {
        digest: "ac53712c613929892413ef90e7f2daa0c8413b412d9a227dee63313301926f13",
        url: `./cas/ac53712c613929892413ef90e7f2daa0c8413b412d9a227dee63313301926f13`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_cup_base_text.scad", {
        digest: "a12d07bfd23795e4a9bd030dd46a50eb669e59e9c27a8a7d3f673f3e5deef952",
        url: `./cas/a12d07bfd23795e4a9bd030dd46a50eb669e59e9c27a8a7d3f673f3e5deef952`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_dividers_removable.scad", {
        digest: "ff14e016bc16d2ffa53722adb186bac79fb6864e421adf6a6099effd2612847d",
        url: `./cas/ff14e016bc16d2ffa53722adb186bac79fb6864e421adf6a6099effd2612847d`,
    })
    
    cachedInputFiles.set("/modules/module_divider_walls.scad", {
        digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        url: `./cas/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
    })
    
    cachedInputFiles.set("/modules/module_bin_chambers.scad", {
        digest: "26832e68d8a29c970b7ab0d05e8bb893303503b3e25ff85bd27c7fa6fd3171b5",
        url: `./cas/26832e68d8a29c970b7ab0d05e8bb893303503b3e25ff85bd27c7fa6fd3171b5`,
    })
    
    cachedInputFiles.set("/modules/module_fingerslide.scad", {
        digest: "78e35ec3a1edb2480f78d775b2c8927d89b77104a8dc8b69aa897abee19c1e8f",
        url: `./cas/78e35ec3a1edb2480f78d775b2c8927d89b77104a8dc8b69aa897abee19c1e8f`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_efficient_floor.scad", {
        digest: "dc7430567a4382f676b284a7c0e23e384b5e698d2bc3289142f9ad358fa7e35a",
        url: `./cas/dc7430567a4382f676b284a7c0e23e384b5e698d2bc3289142f9ad358fa7e35a`,
    })
    
    cachedInputFiles.set("/modules/module_rounded_negative_champher.scad", {
        digest: "68519de372d40069252655fc0588462425f33e693ef07e8b824bc782d0c3a8ba",
        url: `./cas/68519de372d40069252655fc0588462425f33e693ef07e8b824bc782d0c3a8ba`,
    })
    
    cachedInputFiles.set("/modules/module_calipers.scad", {
        digest: "0717367cd34700455a927c460d0946b4165f77774687e96dad05c2de1f24de1b",
        url: `./cas/0717367cd34700455a927c460d0946b4165f77774687e96dad05c2de1f24de1b`,
    })
    
    cachedInputFiles.set("/modules/thirdparty/ub_caliper.scad", {
        digest: "d993625bae201d0be15005af453e49e790f1184cb0b01fd093a7bf863bc82c7b",
        url: `./cas/d993625bae201d0be15005af453e49e790f1184cb0b01fd093a7bf863bc82c7b`,
    })
    
    cachedInputFiles.set("/gridfinity_baseplate.scad", {
        digest: "e4e831fc999f707f0f8e096919690e92db772db5932018f1dfca755f9e80b255",
        url: `./cas/e4e831fc999f707f0f8e096919690e92db772db5932018f1dfca755f9e80b255`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_baseplate.scad", {
        digest: "decb6d629337b7118a56f35681d8dd4f7327d92e98be7f6e06ac649311937b93",
        url: `./cas/decb6d629337b7118a56f35681d8dd4f7327d92e98be7f6e06ac649311937b93`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_baseplate_common.scad", {
        digest: "68c5528e3b12169ee1281953425c30c2d21b1b411d015ebf427c4fb8907f4e83",
        url: `./cas/68c5528e3b12169ee1281953425c30c2d21b1b411d015ebf427c4fb8907f4e83`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_baseplate_regular.scad", {
        digest: "ae186d29725528515a8b889343b99bba82239ac0a2f98d9e45fecf5880ccb0dc",
        url: `./cas/ae186d29725528515a8b889343b99bba82239ac0a2f98d9e45fecf5880ccb0dc`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_baseplate_cnclaser.scad", {
        digest: "8572c6d3e0d57b42fe093f6da5406dd3efb4a627361d9e82cbc98ea42930d081",
        url: `./cas/8572c6d3e0d57b42fe093f6da5406dd3efb4a627361d9e82cbc98ea42930d081`,
    })
    
    cachedInputFiles.set("/gridfinity_item_holder.scad", {
        digest: "2ac8d199d0f567651d554fbeaa88045291bd5656969e581d4aa5be3261445b05",
        url: `./cas/2ac8d199d0f567651d554fbeaa88045291bd5656969e581d4aa5be3261445b05`,
    })
    
    cachedInputFiles.set("/modules/module_item_holder_data.scad", {
        digest: "f6b5bc09495c9998679c89aae5c5022b20c80a84a0f75645ef96e2b173851029",
        url: `./cas/f6b5bc09495c9998679c89aae5c5022b20c80a84a0f75645ef96e2b173851029`,
    })
    
    cachedInputFiles.set("/gridfinity_drawers.scad", {
        digest: "961728ebf56bf5eea9742c0a82ad470d0bc86be922d7207bf6358a619b3ffa24",
        url: `./cas/961728ebf56bf5eea9742c0a82ad470d0bc86be922d7207bf6358a619b3ffa24`,
    })
    
    cachedInputFiles.set("/modules/polyround.scad", {
        digest: "010c0976bb19aca3cb1a9fa0d66c9dd01c21bc4baaace1cb85c81b430307ee77",
        url: `./cas/010c0976bb19aca3cb1a9fa0d66c9dd01c21bc4baaace1cb85c81b430307ee77`,
    })
    
    cachedInputFiles.set("/gridfinity_lid.scad", {
        digest: "d75e881a9913c31b2a5ec2f82dbbbcaf4f68ba06660419e5d867e46af657dd3f",
        url: `./cas/d75e881a9913c31b2a5ec2f82dbbbcaf4f68ba06660419e5d867e46af657dd3f`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_lid.scad", {
        digest: "fbcac06e81b5531da8b804ea9edc7ed4a8097a14a3864c453ef963977c1bdb24",
        url: `./cas/fbcac06e81b5531da8b804ea9edc7ed4a8097a14a3864c453ef963977c1bdb24`,
    })
    
    cachedInputFiles.set("/modules/module_gridfinity_baseplate_lid.scad", {
        digest: "ea829aea5d01473c56b9e5eea83899bfa001039e7308e118778464ff0d704f34",
        url: `./cas/ea829aea5d01473c56b9e5eea83899bfa001039e7308e118778464ff0d704f34`,
    })
    
    cachedInputFiles.set("/gridfinity_marble.scad", {
        digest: "e37a392c9ae68098485de54d1933e53e7f0d1bb2e6924abf1421754b1c600b6c",
        url: `./cas/e37a392c9ae68098485de54d1933e53e7f0d1bb2e6924abf1421754b1c600b6c`,
    })
    
    cachedInputFiles.set("/gridfinity_tray.scad", {
        digest: "e8ee6e4de9173f38e74cd698ceeb9d47fce4322db12a5afa3168e7c230e59248",
        url: `./cas/e8ee6e4de9173f38e74cd698ceeb9d47fce4322db12a5afa3168e7c230e59248`,
    })
    
    cachedInputFiles.set("/gridfinity_vertical_divider.scad", {
        digest: "16837343bbe79f39786a294b89597535d73d8bd5546defdf7e5e753edfc21a84",
        url: `./cas/16837343bbe79f39786a294b89597535d73d8bd5546defdf7e5e753edfc21a84`,
    })
    
    cachedInputFiles.set("/stanley_basic_cup.scad", {
        digest: "4dd69fa8d167dd4555a145d1c30d65ea4ad3173c1f7ef5e131434698cf4ed0bf",
        url: `./cas/4dd69fa8d167dd4555a145d1c30d65ea4ad3173c1f7ef5e131434698cf4ed0bf`,
    })
    
    cachedInputFiles.set("/gridfinity_baseplate_flsun_q5.scad", {
        digest: "1f2d72f67185b0fccb67e4a404837b7dcec62b735b30353bae25e3d43b81216e",
        url: `./cas/1f2d72f67185b0fccb67e4a404837b7dcec62b735b30353bae25e3d43b81216e`,
    })
    
    cachedInputFiles.set("/gridfinity_chess.scad", {
        digest: "dc25f78fbca53838b5cef087a83d9606931691eee6acef3ec8e7f75266dae8cc",
        url: `./cas/dc25f78fbca53838b5cef087a83d9606931691eee6acef3ec8e7f75266dae8cc`,
    })
    
    cachedInputFiles.set("/gridfinity_glue_stick.scad", {
        digest: "8e32a502c6cea35ee7fa561e273bcb9ef944eeb64cc25fecaf743592ca0b381a",
        url: `./cas/8e32a502c6cea35ee7fa561e273bcb9ef944eeb64cc25fecaf743592ca0b381a`,
    })
    
    cachedInputFiles.set("/gridfinity_sieve.scad", {
        digest: "e0116f54da5349babeb2ef7987492707562e641cb0fd1a5d620ac05ced15177a",
        url: `./cas/e0116f54da5349babeb2ef7987492707562e641cb0fd1a5d620ac05ced15177a`,
    })
    
    cachedInputFiles.set("/gridfinity_silverware_legacy.scad", {
        digest: "0b5a9c4b58749a031c468948e25382161b7d56a334b283c22d92b056d16bce08",
        url: `./cas/0b5a9c4b58749a031c468948e25382161b7d56a334b283c22d92b056d16bce08`,
    })
    
    cachedInputFiles.set("/gridfinity_silverware.scad", {
        digest: "4ea6edde1b0c94113b54a27f1c81bd840b0219671b2e9c288de949fd8d6cba44",
        url: `./cas/4ea6edde1b0c94113b54a27f1c81bd840b0219671b2e9c288de949fd8d6cba44`,
    })
    
    cachedInputFiles.set("/gridfinity_sliding_lid.scad", {
        digest: "c0994ca87384655aeda19507bb74f47ffc970cd039eb8c77779df29ac8ecd911",
        url: `./cas/c0994ca87384655aeda19507bb74f47ffc970cd039eb8c77779df29ac8ecd911`,
    })
    
    cachedInputFiles.set("/gridfinity_socket_holder.scad", {
        digest: "11b8c54d9997c6b44102e662cf32fd287edb831bd859d5d43de49f5e1cc10d41",
        url: `./cas/11b8c54d9997c6b44102e662cf32fd287edb831bd859d5d43de49f5e1cc10d41`,
    })
    
    cachedInputFiles.set("/fonts/fonts.conf", {
        digest: "e9d89a77da733501cda58d12f3c6d522412c56ecab83e2ebf2a7e544558eada4",
        url: `./cas/e9d89a77da733501cda58d12f3c6d522412c56ecab83e2ebf2a7e544558eada4`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSans-Regular.ttf", {
        digest: "4659bc0c58c5028dd488ec928d41d9265db43d9b669fc14ca8b0832daca7b144",
        url: `./cas/4659bc0c58c5028dd488ec928d41d9265db43d9b669fc14ca8b0832daca7b144`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSans-Bold.ttf", {
        digest: "3973aa5054fb467dd5627245d3dc82e37bf16fe075756156a570455871351582",
        url: `./cas/3973aa5054fb467dd5627245d3dc82e37bf16fe075756156a570455871351582`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSans-Italic.ttf", {
        digest: "830c5fa600505fb4c1a271b4271c53c44bae43f492b2a240d0e98a3a7a380121",
        url: `./cas/830c5fa600505fb4c1a271b4271c53c44bae43f492b2a240d0e98a3a7a380121`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSans-BoldItalic.ttf", {
        digest: "c80fa7f2ffa0e01d4d8dcd6a6d1e43eda665222d1b4db597dde1174c456006cf",
        url: `./cas/c80fa7f2ffa0e01d4d8dcd6a6d1e43eda665222d1b4db597dde1174c456006cf`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSerif-Regular.ttf", {
        digest: "705903ae1382f0150f115d6f10a30f5b2f3d6ade649c474afe6366c39174fb65",
        url: `./cas/705903ae1382f0150f115d6f10a30f5b2f3d6ade649c474afe6366c39174fb65`,
    })
    
    cachedInputFiles.set("/fonts/LiberationSerif-Bold.ttf", {
        digest: "9e66c25e20868756bf12eb24a520a4552727c9cd108f577f7ae33e3c0110e39c",
        url: `./cas/9e66c25e20868756bf12eb24a520a4552727c9cd108f577f7ae33e3c0110e39c`,
    })
    
    cachedInputFiles.set("/fonts/LiberationMono-Regular.ttf", {
        digest: "395fa5ab8d40c8eba390ced528744ea75a7f69aabf3e68b6f925ca0e39a27370",
        url: `./cas/395fa5ab8d40c8eba390ced528744ea75a7f69aabf3e68b6f925ca0e39a27370`,
    })
    
    cachedInputFiles.set("/fonts/LiberationMono-Bold.ttf", {
        digest: "626655e94dd82f3f42549daf995c921b0915fa8ab1f4b839559e8892ea41d240",
        url: `./cas/626655e94dd82f3f42549daf995c921b0915fa8ab1f4b839559e8892ea41d240`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSans.ttf", {
        digest: "ae7b7855e115a5966d8b1b3f80f254ccc117ec86f9965e202ee2940453837280",
        url: `./cas/ae7b7855e115a5966d8b1b3f80f254ccc117ec86f9965e202ee2940453837280`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSans-Bold.ttf", {
        digest: "5c1247acef7f2b8522a31742c76d6adcb5569bacc0be7ceaa4dc39dd252ce895",
        url: `./cas/5c1247acef7f2b8522a31742c76d6adcb5569bacc0be7ceaa4dc39dd252ce895`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSans-Oblique.ttf", {
        digest: "2d7b524ce7d51db78591b4e19c8185b89f3af0aa6534c5e524cf0c6f4ea673de",
        url: `./cas/2d7b524ce7d51db78591b4e19c8185b89f3af0aa6534c5e524cf0c6f4ea673de`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSans-BoldOblique.ttf", {
        digest: "58d78a24ddff9ab30427550d68f0b9b7dd28d6690f9f4b3e4ebac7105252e9b2",
        url: `./cas/58d78a24ddff9ab30427550d68f0b9b7dd28d6690f9f4b3e4ebac7105252e9b2`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSerif.ttf", {
        digest: "8f2c103bfa3fd5de71f1b92b18f21906b5a26871fb7e19a9a4c9af539c3cc7ab",
        url: `./cas/8f2c103bfa3fd5de71f1b92b18f21906b5a26871fb7e19a9a4c9af539c3cc7ab`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSerif-Bold.ttf", {
        digest: "847b33e13925f19ff87e4d934d6b3cf7cac35ce16424f6f670e40c2f377cf2df",
        url: `./cas/847b33e13925f19ff87e4d934d6b3cf7cac35ce16424f6f670e40c2f377cf2df`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSansMono.ttf", {
        digest: "c805f9436dbc268644c1d9584f01a601a653e028e08fd74b9b949f6cf8304d88",
        url: `./cas/c805f9436dbc268644c1d9584f01a601a653e028e08fd74b9b949f6cf8304d88`,
    })
    
    cachedInputFiles.set("/fonts/DejaVuSansMono-Bold.ttf", {
        digest: "3a3c502eeff669a231549e80df9f7c49de109bafe303170409e905d0b31a38fe",
        url: `./cas/3a3c502eeff669a231549e80df9f7c49de109bafe303170409e905d0b31a38fe`,
    })
    
    return cachedInputFiles
}

async function fetchBytes(url) {
    const r = await fetch(url)
    if (!r.ok) {
        throw new Error(`Failed to fetch ${url}: ${r.status} ${r.statusText}`)
    }
    return new Uint8Array(await r.arrayBuffer())
}

async function preloadAllInputFiles() {
    if (preloadAllInputsPromise) {
        await preloadAllInputsPromise
        return
    }

    const files = getCachedInputFiles()
    preloadAllInputsPromise = Promise.all(
        Array.from(files.values()).map(async (entry) => {
            if (!entry.bytes) {
                entry.bytes = await fetchBytes(entry.url)
            }
        }),
    ).then(() => undefined)

    await preloadAllInputsPromise
}

function loadInputFileIntoInstance(instance, virtualPath, bytes) {
    const fullPath = virtualPath
    const parent = fullPath.substring(0, fullPath.lastIndexOf("/"))
    if (parent) {
        instance.FS.mkdirTree(parent)
    }
    instance.FS.writeFile(fullPath, bytes)
    try {
        // Make input read-only inside the FS
        instance.FS.chmod(fullPath, 0o444)
    } catch (e) {
        // ignore
    }
}

async function populateInstanceInputFiles(instance) {
    await preloadAllInputFiles()

    const files = getCachedInputFiles()
    for (const [virtualPath, entry] of files.entries()) {
        if (!entry.bytes) {
            throw new Error(`Input not loaded: ${virtualPath}`)
        }
        loadInputFileIntoInstance(instance, virtualPath, entry.bytes)
    }
}

function applyDepthCueing(geometry, previewStyle) {
    const pos = geometry.getAttribute("position")
    if (!pos || pos.count < 3) {
        return
    }
    const baseColors = geometry.getAttribute("color")
    const useFaceColors = previewStyle === "colors"

    let minZ = Infinity
    let maxZ = -Infinity
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i)
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
    }

    const range = maxZ - minZ
    if (!isFinite(range) || range <= 0) {
        return
    }

    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i)
        const t = (z - minZ) / range
        const k = i * 3

        if (useFaceColors && baseColors) {
            const r = baseColors.getX(i)
            const g = baseColors.getY(i)
            const b = baseColors.getZ(i)
            // Keep the OpenSCAD color hue, but vary luminance with Z so
            // pockets and vertical surfaces remain readable. Colored
            // models need a narrower luminance range than the default
            // gray preview or saturated colors wash out.
            colors[k] = (r + (1 - r) * 0.08) * (1 - t) + (r * 0.78) * t
            colors[k + 1] = (g + (1 - g) * 0.08) * (1 - t) + (g * 0.78) * t
            colors[k + 2] = (b + (1 - b) * 0.08) * (1 - t) + (b * 0.78) * t
        } else {
            const c = DEFAULT_BOTTOM_COLOR.clone().lerp(DEFAULT_TOP_COLOR, t)
            colors[k] = c.r
            colors[k + 1] = c.g
            colors[k + 2] = c.b
        }
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}

async function geometryToGlb(geometry, previewStyle) {
    if (geometry.index) {
        // Keep vertex colors stable for per-face colored geometry.
        geometry = geometry.toNonIndexed()
    }
    if (!geometry.getAttribute("normal")) {
        geometry.computeVertexNormals()
    }

    const neutralLighting = previewStyle === "colors"
    const material = new THREE.MeshStandardMaterial({
        color: 0xc4d0dd,
        metalness: neutralLighting ? 0.0 : 0.8,
        roughness: neutralLighting ? 0.55 : 0.4,
        flatShading: true,
        vertexColors: true,
    })
    const mesh = new THREE.Mesh(geometry, material)
    // OpenSCAD uses mm; glTF uses meters.
    mesh.scale.setScalar(0.001)

    const scene = new THREE.Scene()
    scene.add(mesh)

    // Add a few basic lights so the exported GLB shades nicely even without an HDR environment.
    const lightA = new THREE.DirectionalLight(neutralLighting ? 0xffffff : 0xd6629e, neutralLighting ? 4 : 20) // top right
    lightA.position.set(1000, 1000, 1000) // north east, top
    lightA.lookAt(0, 0, 0)
    scene.add(lightA)

    const lightB = new THREE.DirectionalLight(neutralLighting ? 0xffffff : 0x5571a8, neutralLighting ? 2.5 : 20) // top left
    lightB.position.set(-1000, 1000, 1000) // north west, top
    lightB.lookAt(0, 0, 0)
    scene.add(lightB)

    const lightC = new THREE.DirectionalLight(neutralLighting ? 0xffffff : 0xbf86bb, neutralLighting ? 1 : 15) // bottom
    lightC.position.set(0, -1000, -1000) // south, bottom
    lightC.lookAt(0, 0, 0)
    scene.add(lightC)

    const lightD = new THREE.DirectionalLight(neutralLighting ? 0xffffff : 0xbf86bb, neutralLighting ? 1.5 : 15) // front
    lightD.position.set(0, -1000, 1000) // south, top
    lightD.lookAt(0, 0, 0)
    scene.add(lightD)

    return await new Promise((resolve, reject) => {
        const exporter = new GLTFExporter()
        exporter.parse(
            scene,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    resolve(result)
                } else {
                    reject(new Error("Expected binary glTF (ArrayBuffer)"))
                }
            },
            (error) => reject(error),
            { binary: true },
        )
    })
}

function offBytesToMesh(offBytes) {
    const text = new TextDecoder().decode(offBytes)
    return parseOffMesh(text)
}

async function offMeshToGlb(mesh, previewStyle) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3))
    if (mesh.colors) {
        geometry.setAttribute("color", new THREE.BufferAttribute(mesh.colors, 3))
    }
    applyDepthCueing(geometry, previewStyle)
    return geometryToGlb(geometry, previewStyle)
}

async function createInstance() {
    const instance = await OpenSCAD({
        noInitialRun: true,
        print: logInfo,
        printErr: logInfo,
    })

    // OpenSCAD uses fontconfig for text() rendering.
    // In WASM there is no system fontconfig, so we ship a small config + fonts.
    // The Emscripten runtime exposes process environment via instance.ENV.
    // Set this before calling into OpenSCAD.
    if (instance.ENV) {
        instance.ENV.FONTCONFIG_PATH = "/fonts"
        instance.ENV.FONTCONFIG_FILE = "/fonts/fonts.conf"
        instance.ENV.HOME = "/tmp"
    }
    instance.FS.mkdirTree("/tmp/fontconfig")
    return instance
}

async function renderOnce({ input, normalParams, additionalParams, previewStyle }) {
    const instance = await createInstance()

    // Eagerly fetch all inputs once (parallel), then materialize them in each
    // fresh OpenSCAD instance.
    if (!getCachedInputFiles().has(input)) {
        throw new Error(`Unknown input file: ${input}`)
    }
    await populateInstanceInputFiles(instance)

    const stringifiedParameters = {}
    for (const [k, v] of Object.entries(normalParams)) {
        // Parameter set files use unquoted strings for string parameters.
        stringifiedParameters[k] = typeof v === "string" ? v : JSON.stringify(v)
    }
    logInfo("Parameters:", stringifiedParameters)
    instance.FS.writeFile(
        "/parameters.json",
        JSON.stringify({
            fileFormatVersion: 1,
            parameterSets: {
                single: stringifiedParameters,
            },
        }),
    )

    const output = "/output.off"
    try {
        instance.FS.unlink(output)
    } catch (e) {
        // ignore
    }
    try {
        instance.FS.unlink("/camera-summary.json")
    } catch (e) {
        // ignore
    }
    const args = [
        input,
        "-o",
        output,
        
        "--export-format=off",
        "-p",
        "/parameters.json",
        "-P",
        "single",
        "--summary",
        "camera",
        "--summary-file",
        "/camera-summary.json",
    ]
    for (const [k, v] of Object.entries(additionalParams)) {
        // -D expects an OpenSCAD expression; JSON happens to be close enough for our value types.
        args.push("-D", `${k}=${JSON.stringify(v)}`)
    }
    logInfo("Line:", args)
    try {
        instance.callMain(args)
        const offBytes = instance.FS.readFile(output)
        const mesh = offBytesToMesh(offBytes)
        const glb = await offMeshToGlb(mesh, previewStyle || "shaded")
        const stl = offMeshToBinaryStl(mesh)
        let camera = null
        try {
            const summaryBytes = instance.FS.readFile("/camera-summary.json", { encoding: "utf8" })
            const summary = JSON.parse(summaryBytes)
            if (summary && summary.camera) {
                camera = summary.camera
            }
        } catch (e) {
            logInfo("No camera summary available:", e)
        }
        self.postMessage({
            type: "ok",
            glb: glb,
            stl: stl,
            camera: camera,
        })
    } catch (e) {
        logError(e)
        self.postMessage({
            type: "error",
            error: formatErrorForMessage(e),
            stack: String(e && e.stack ? e.stack : ""),
            log: currentLog,
        })
    }
}

self.addEventListener("message", (event) => {
    const msg = event && event.data
    if (!msg || typeof msg !== "object") {
        return
    }

    // Serialize OpenSCAD runs to avoid concurrent FS/wasm access.
    runQueue = runQueue.then(async () => {
        if (msg.type !== "render") {
            return
        }
        currentLog = ""
        currentLogTruncated = false
        await renderOnce({
            input: msg.input,
            normalParams: msg.normalParams,
            additionalParams: msg.additionalParams,
            previewStyle: msg.previewStyle,
        })
    })
    runQueue.catch((e) => {
        logError(e)
        self.postMessage({
            type: "error",
            error: formatErrorForMessage(e),
            stack: String(e && e.stack ? e.stack : ""),
            log: currentLog,
        })
    })
})