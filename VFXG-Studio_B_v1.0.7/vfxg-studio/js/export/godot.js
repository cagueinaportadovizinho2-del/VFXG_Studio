// Exporta um pacote .zip para Godot 4.x. A cena usa caminhos RELATIVOS ao .tscn,
// então o pacote funciona em qualquer pasta do projeto. Contém partículas e/ou efeito de interseção.
const _f = v => +(+v).toFixed(4);
const _g = v => { const t = String(+(+v).toFixed(4)); return /[.e]/.test(t) ? t : t + '.0'; }; // floats sempre com ponto (a Godot não aceita int em float)

VFX.godotShader = function (p) {
  const e = new THREE.Color(p.ixEdge), b = new THREE.Color(p.ixBase), v4 = (c, a) => `vec4(${_g(c.r)}, ${_g(c.g)}, ${_g(c.b)}, ${_g(a)})`;
  return `// VFXG Studio - Intersection: borda de luz onde o objeto atravessa outra superfície.
// Aplique este material em qualquer MeshInstance3D (Material Override). Precisa da textura de profundidade:
// funciona no Forward+ e no Mobile. No Compatibility, ligue "compatibility_renderer" no material.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, ${p.ixDouble ? 'cull_disabled' : 'cull_back'};

uniform vec4 base_color : source_color = ${v4(b, p.ixBaseA)};
uniform sampler2D albedo_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform bool use_albedo_texture = false;
uniform vec4 edge_color : source_color = ${v4(e, p.ixEdgeA)};
uniform float edge_width = ${_g(p.ixWidth)};
uniform float edge_power = ${_g(p.ixPower)};
uniform float intensity = ${_g(p.ixIntensity)};
uniform float fresnel_strength = ${_g(p.ixFresnel)};
uniform bool compatibility_renderer = false;
uniform sampler2D depth_texture : hint_depth_texture, repeat_disable, filter_nearest;

void fragment() {
	float depth = textureLod(depth_texture, SCREEN_UV, 0.0).r;
	vec3 ndc = compatibility_renderer ? vec3(SCREEN_UV, depth) * 2.0 - 1.0 : vec3(SCREEN_UV * 2.0 - 1.0, depth);
	vec4 view = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
	view.xyz /= view.w;
	float scene_dist = -view.z;               // distância da superfície que está atrás
	float diff = scene_dist + VERTEX.z;       // distância entre ela e este pixel do objeto
	float edge = pow(1.0 - clamp(diff / edge_width, 0.0, 1.0), edge_power);
	float fr = pow(1.0 - abs(dot(normalize(NORMAL), normalize(VIEW))), 3.0) * fresnel_strength;
	float glow = clamp(edge + fr * 0.5, 0.0, 1.0);
	vec3 body = base_color.rgb;
	float body_a = base_color.a;
	if (use_albedo_texture) {
		vec4 t = texture(albedo_texture, UV);
		body *= t.rgb;
		body_a *= t.a;
	}
	ALBEDO = mix(body, edge_color.rgb, glow);
	ROUGHNESS = 0.6;
	EMISSION = edge_color.rgb * intensity * glow;
	ALPHA = clamp(mix(body_a, edge_color.a, glow), 0.0, 1.0);
}
`;
};

VFX.godotMaterial = function (p, shaderPath, texPath) {
  const e = new THREE.Color(p.ixEdge), b = new THREE.Color(p.ixBase), c = (k, a) => `Color(${[k.r, k.g, k.b, a].map(_g).join(', ')})`;
  return `[gd_resource type="ShaderMaterial" format=3]

[ext_resource type="Shader" path="${shaderPath}" id="1_shader"]
${texPath ? `[ext_resource type="Texture2D" path="${texPath}" id="2_tex"]\n` : ''}
[resource]
shader = ExtResource("1_shader")
shader_parameter/base_color = ${c(b, p.ixBaseA)}
${texPath ? 'shader_parameter/use_albedo_texture = true\nshader_parameter/albedo_texture = ExtResource("2_tex")\n' : ''}shader_parameter/edge_color = ${c(e, p.ixEdgeA)}
shader_parameter/edge_width = ${_g(p.ixWidth)}
shader_parameter/edge_power = ${_g(p.ixPower)}
shader_parameter/intensity = ${_g(p.ixIntensity)}
shader_parameter/fresnel_strength = ${_g(p.ixFresnel)}
`;
};

VFX.godotDissolveShader = function (p) {
  const e = new THREE.Color(p.dsEdge), b = new THREE.Color(p.ixBase), v4 = (c, a) => `vec4(${_g(c.r)}, ${_g(c.g)}, ${_g(c.b)}, ${_g(a)})`;
  return `// VFXG Studio - Dissolve: o objeto some por ruído (ou de baixo para cima) com borda brilhante.
// Aplique este material em qualquer MeshInstance3D (Material Override) e anime "dissolve_amount" de 0 a 1.
// height_min/height_max: faixa de altura LOCAL do modelo usada na dissolução de baixo para cima
// (-0.5 a 0.5 serve para modelos de 1 unidade de altura; ajuste para o seu).
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, ${p.dsDouble ? 'cull_disabled' : 'cull_back'};

uniform vec4 base_color : source_color = ${v4(b, 1)};
uniform sampler2D albedo_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform bool use_albedo_texture = false;
uniform float dissolve_amount : hint_range(0.0, 1.0) = ${_g(p.dsAmount)};
uniform float noise_scale = ${_g(p.dsScale)};
uniform float direction_mix : hint_range(0.0, 1.0) = ${_g(p.dsDir)};
uniform float height_min = -0.5;
uniform float height_max = 0.5;
uniform vec4 edge_color : source_color = ${v4(e, 1)};
uniform float edge_width = ${_g(p.dsEdgeW)};
uniform float edge_intensity = ${_g(p.dsIntensity)};

varying vec3 local_pos;

${VFX.NOISE_GLSL}
void vertex() {
	local_pos = VERTEX;
}

void fragment() {
	float n = fbm(local_pos * noise_scale);
	float g = clamp((local_pos.y - height_min) / (height_max - height_min), 0.0, 1.0);
	float h = mix(n, g, direction_mix);
	float threshold = dissolve_amount * (1.0 + edge_width) - edge_width;
	if (h <= threshold) {
		discard;
	}
	float e = 1.0 - smoothstep(0.0, edge_width, h - threshold);
	vec3 body = base_color.rgb;
	if (use_albedo_texture) {
		body *= texture(albedo_texture, UV).rgb;
	}
	ALBEDO = mix(body, edge_color.rgb, e);
	ROUGHNESS = 0.6;
	EMISSION = edge_color.rgb * edge_intensity * e;
}
`;
};

VFX.godotDissolveMaterial = function (p, shaderPath, texPath) {
  const e = new THREE.Color(p.dsEdge), b = new THREE.Color(p.ixBase), c = (k, a) => `Color(${[k.r, k.g, k.b, a].map(_g).join(', ')})`;
  return `[gd_resource type="ShaderMaterial" format=3]

[ext_resource type="Shader" path="${shaderPath}" id="1_shader"]
${texPath ? `[ext_resource type="Texture2D" path="${texPath}" id="2_tex"]\n` : ''}
[resource]
shader = ExtResource("1_shader")
shader_parameter/base_color = ${c(b, 1)}
${texPath ? 'shader_parameter/use_albedo_texture = true\nshader_parameter/albedo_texture = ExtResource("2_tex")\n' : ''}shader_parameter/dissolve_amount = ${_g(p.dsAmount)}
shader_parameter/noise_scale = ${_g(p.dsScale)}
shader_parameter/direction_mix = ${_g(p.dsDir)}
shader_parameter/edge_color = ${c(e, 1)}
shader_parameter/edge_width = ${_g(p.dsEdgeW)}
shader_parameter/edge_intensity = ${_g(p.dsIntensity)}
`;
};

VFX.godotTscn = function (p, res) { // res: { tex?, mesh?, shader?, ixMesh? } — caminhos relativos ao .tscn
  const n = VFX.safeName(p.name), ext = [], sub = [], nodes = [], f = _f;
  const col = (c, a) => [c.r, c.g, c.b, a].map(f).join(', '), D = Math.PI / 180;

  if (p.partOn) {
    const c1 = new THREE.Color(p.colorStart), c2 = new THREE.Color(p.colorEnd), mesh = !!res.mesh;
    const at = Math.min(Math.max(p.alphaEndAt, 0.001), 1), cm = new THREE.Color().lerpColors(c1, c2, at);
    const grad = at < 1
      ? { o: `0, ${f(at)}, 1`, c: `${col(c1, p.alphaStart)}, ${col(cm, p.alphaEnd)}, ${col(c2, p.alphaEnd)}` }
      : { o: '0, 1', c: `${col(c1, p.alphaStart)}, ${col(c2, p.alphaEnd)}` };
    const size = Math.max(p.sizeStart, 0.01), ratio = f(p.sizeEnd / size), shape = { point: 0, sphere: 1, box: 3 }[p.shape];
    const ex = a => Math.max(p.shape === 'box' ? a : 0, p.shape === 'sphere' ? p.radius : 0);
    const reach = p.speed * p.lifetime + 0.5 * Math.abs(p.gravity) * p.lifetime * p.lifetime + size * 1.5;
    const hx = f(ex(p.boxX) + reach), hy = f(ex(p.boxY) + reach), hz = f(ex(p.boxZ) + reach);
    ext.push(mesh ? `[ext_resource type="ArrayMesh" path="${res.mesh}" id="1_mesh"]` : `[ext_resource type="Texture2D" path="${res.tex}" id="1_tex"]`);
    sub.push(`[sub_resource type="Gradient" id="Gradient_1"]
offsets = PackedFloat32Array(${grad.o})
colors = PackedColorArray(${grad.c})`,
`[sub_resource type="GradientTexture1D" id="GradientTexture1D_1"]
gradient = SubResource("Gradient_1")`,
`[sub_resource type="Curve" id="Curve_1"]
max_value = ${Math.max(1, ratio)}
_data = [Vector2(0, 1), 0.0, 0.0, 0, 0, Vector2(1, ${ratio}), 0.0, 0.0, 0, 0]
point_count = 2`,
`[sub_resource type="CurveTexture" id="CurveTexture_1"]
curve = SubResource("Curve_1")`,
`[sub_resource type="ParticleProcessMaterial" id="PPM_1"]
emission_shape = ${shape}
${p.shape === 'sphere' ? `emission_sphere_radius = ${p.radius}\n` : ''}${p.shape === 'box' ? `emission_box_extents = Vector3(${p.boxX}, ${p.boxY}, ${p.boxZ})\n` : ''}direction = Vector3(0, ${p.down ? -1 : 1}, 0)
spread = ${(+p.spread).toFixed(1)}
initial_velocity_min = ${f(p.speed * (1 - p.speedRandom))}
initial_velocity_max = ${f(p.speed)}
angular_velocity_min = ${p.rotSpeed}
angular_velocity_max = ${p.rotSpeed}
gravity = Vector3(0, ${p.gravity}, 0)
damping_min = ${p.damping}
damping_max = ${p.damping}
angle_min = ${-p.rotation}
angle_max = ${p.rotation}
scale_min = ${f(size * (1 - p.sizeRandom))}
scale_max = ${f(size)}
scale_curve = SubResource("CurveTexture_1")
color_ramp = SubResource("GradientTexture1D_1")`,
`[sub_resource type="StandardMaterial3D" id="Mat_1"]
transparency = 1
blend_mode = ${p.blend === 'add' ? 1 : 0}
shading_mode = 0
vertex_color_use_as_albedo = true
${mesh ? 'cull_mode = 2' : `albedo_texture = ExtResource("1_tex")\nbillboard_mode = ${p.alignVel ? 2 : 3}\nbillboard_keep_scale = true`}`);
    if (!mesh) sub.push(`[sub_resource type="QuadMesh" id="Quad_1"]\nmaterial = SubResource("Mat_1")\nsize = Vector2(1, 1)`);
    nodes.push(`[node name="Particulas" type="GPUParticles3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, ${p.offsetY}, 0)
amount = ${p.amount}
lifetime = ${p.lifetime}
one_shot = ${!p.loop}
explosiveness = ${p.mode === 'burst' ? 1.0 : 0.0}
local_coords = ${!!p.localCoords}
visibility_aabb = AABB(${-hx}, ${-hy}, ${-hz}, ${f(hx * 2)}, ${f(hy * 2)}, ${f(hz * 2)})
process_material = SubResource("PPM_1")
${mesh ? 'material_override = SubResource("Mat_1")\ndraw_pass_1 = ExtResource("1_mesh")' : 'draw_pass_1 = SubResource("Quad_1")'}`);
  }

  if ((p.ixOn || p.dsOn) && res.material) { // cena-template: objetos de teste (chão etc.); os marcados usam o material de interseção
    const row = m => { const e = m.elements; return [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10], e[12], e[13], e[14]].map(f).join(', '); };
    const prim = { floor: `[sub_resource type="BoxMesh" id="M_floor"]\nsize = Vector3(10, 0.2, 10)`, cube: `[sub_resource type="BoxMesh" id="M_cube"]\nsize = Vector3(1, 1, 1)`,
      sphere: `[sub_resource type="SphereMesh" id="M_sphere"]\nradius = 0.5\nheight = 1.0`, cylinder: `[sub_resource type="CylinderMesh" id="M_cylinder"]\ntop_radius = 0.5\nbottom_radius = 0.5\nheight = 1.0` };
    const items = res.items || [], used = {}, modelIds = {}; let firstFx = '';
    ext.push(`[ext_resource type="ShaderMaterial" path="${res.material}" id="3_ixmat"]`);
    items.forEach(it => { if (it.kind === 'model') { if (res.itemMeshes[it.model] && !modelIds[it.model]) { modelIds[it.model] = 'm_' + (Object.keys(modelIds).length + 1); ext.push(`[ext_resource type="ArrayMesh" path="${res.itemMeshes[it.model]}" id="${modelIds[it.model]}"]`); } } else used[it.kind] = 1; });
    Object.keys(used).forEach(k => sub.push(prim[k]));
    sub.push(`[sub_resource type="StandardMaterial3D" id="Mat_floor"]\nalbedo_color = Color(0.2353, 0.2588, 0.3216, 1)\nroughness = 0.9`, `[sub_resource type="StandardMaterial3D" id="Mat_gray"]\nalbedo_color = Color(0.4784, 0.5098, 0.5882, 1)\nroughness = 0.85`);
    items.forEach(it => {
      if (it.kind === 'model' && !modelIds[it.model]) return;
      const nm = ({ floor: 'Chao', cube: 'Cubo', sphere: 'Esfera', cylinder: 'Cilindro' })[it.kind] || VFX.safeName(it.model), m = it.m.clone();
      if (it.kind === 'floor') m.multiply(new THREE.Matrix4().makeTranslation(0, -0.1, 0)); // a geometria do chão tem o topo em y=0
      const nodeName = `${nm}_${it.id}`; if (it.fx && !firstFx) firstFx = nodeName;
      nodes.push(`[node name="${nodeName}" type="MeshInstance3D" parent="."]
transform = Transform3D(${row(m)})
mesh = ${it.kind === 'model' ? `ExtResource("${modelIds[it.model]}")` : `SubResource("M_${it.kind}")`}
material_override = ${it.fx ? 'ExtResource("3_ixmat")' : it.kind === 'floor' ? 'SubResource("Mat_floor")' : 'SubResource("Mat_gray")'}`);
    });
    if (p.dsOn && p.dsAnimate && firstFx) { // AnimationPlayer que anima dissolve_amount de 0 a 1 (autoplay)
      const D = f(p.dsDuration);
      sub.push(`[sub_resource type="Animation" id="Anim_dissolve"]
resource_name = "dissolve"
length = ${D}
loop_mode = ${p.dsLoop ? 1 : 0}
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("${firstFx}:material_override:shader_parameter/dissolve_amount")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0, ${D}),
"transitions": PackedFloat32Array(1, 1),
"update": 0,
"values": [0.0, 1.0]
}`, `[sub_resource type="AnimationLibrary" id="AnimLib_dissolve"]
_data = {
&"dissolve": SubResource("Anim_dissolve")
}`);
      nodes.push(`[node name="AnimationPlayer" type="AnimationPlayer" parent="."]
libraries = {
&"": SubResource("AnimLib_dissolve")
}
autoplay = "dissolve"`);
    }
  }
  return ['[gd_scene format=3]', ext.join('\n'), sub.join('\n\n'), `[node name="${n}" type="Node3D"]`, nodes.join('\n\n')].filter(Boolean).join('\n\n') + '\n';
};

VFX.exportGodotPackage = async function (P, items) {
  if (!P.partOn && !P.ixOn && !P.dsOn) throw new Error('ative Partículas, Interseção ou Dissolver antes de exportar');
  const n = VFX.safeName(P.name), dir = 'vfx/' + n + '/', enc = new TextEncoder(), files = [], res = {}, models = {}, texs = {};
  const addModel = name => { const fn = VFX.safeName(name) + '.obj'; if (!models[fn]) { models[fn] = 1; files.push({ name: dir + 'models/' + fn, data: enc.encode(VFX.assets.toOBJ(name)) }); } return 'models/' + fn; };
  const addTexture = async name => {
    const fn = VFX.safeName(name) + '.png';
    if (!texs[fn]) { texs[fn] = 1; const blob = await new Promise(r => VFX.textures.canvas(name).toBlob(r, 'image/png')); files.push({ name: dir + 'textures/' + fn, data: new Uint8Array(await blob.arrayBuffer()) }); }
    return 'textures/' + fn;
  };
  if (P.partOn) { if (P.model && VFX.assets.models[P.model]) res.mesh = addModel(P.model); else res.tex = await addTexture(P.texture); }
  if (P.ixOn || P.dsOn) {
    const kind = P.dsOn ? 'dissolve' : 'intersection', shader = 'shaders/' + n + '_' + kind + '.gdshader', material = 'materials/' + n + '_' + kind + '.tres';
    const tex = P.ixTexture ? await addTexture(P.ixTexture) : '', sTxt = P.dsOn ? VFX.godotDissolveShader(P) : VFX.godotShader(P);
    const mTxt = (P.dsOn ? VFX.godotDissolveMaterial : VFX.godotMaterial)(P, '../' + shader, tex && '../' + tex);
    files.push({ name: dir + shader, data: enc.encode(sTxt) }, { name: dir + material, data: enc.encode(mTxt) });
    res.material = material; res.items = items || []; res.itemMeshes = {};
    res.items.forEach(it => { if (it.kind === 'model' && VFX.assets.models[it.model]) res.itemMeshes[it.model] = addModel(it.model); });
  }
  files.unshift({ name: dir + n + '.tscn', data: enc.encode(VFX.godotTscn(P, res)) });
  files.push({ name: dir + n + '.vfx.json', data: enc.encode(JSON.stringify(P, null, 2)) });
  const fxName = P.dsOn ? 'dissolve' : 'intersection';
  files.push({ name: dir + 'LEIA-ME.txt', data: enc.encode(
    'VFXG Studio - pacote para Godot 4.7\n\n1. Extraia este zip em QUALQUER pasta do projeto Godot (os caminhos sao relativos ao .tscn).\n2. Abra a Godot e espere a importacao terminar.\n3. Abra ' + n + '.tscn: e a cena-template (raiz Node3D) com os objetos de teste do editor.\n\n' +
    (P.ixOn || P.dsOn ? 'MATERIAL: use materials/' + n + '_' + fxName + '.tres em qualquer MeshInstance3D (Material Override).\n' : '') +
    (P.ixOn ? 'INTERSECTION: o brilho aparece onde o objeto atravessa outra geometria opaca (chao, paredes...).\nUsa a textura de profundidade (renderers Forward+ e Mobile). No Compatibility, marque "compatibility_renderer" no material.\n' : '') +
    (P.dsOn ? 'DISSOLVE: anime o parametro dissolve_amount de 0 (inteiro) a 1 (sumiu). A cena ja traz um AnimationPlayer fazendo isso.\nPara a dissolucao de baixo para cima em modelos que nao tem 1 unidade de altura, ajuste height_min/height_max no material.\n' : '') +
    'Para o brilho "estourar", ative Glow no WorldEnvironment.\nSe a textura nao aparecer: confira se foi importada (aba Import) e reabra a cena.\n') });
  return VFX.zip(files);
};
