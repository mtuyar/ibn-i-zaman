import { Skia } from "@shopify/react-native-skia";

// Simple radial light with noise for atmosphere
export const lightingShader = Skia.RuntimeEffect.Make(`
uniform vec2 u_resolution;
uniform vec2 u_lightPos;
uniform float u_lightRadius;
uniform float u_time;

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

const int NUM_OCTAVES = 5;

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

vec4 main(vec2 xy) {
    vec2 normCoord = xy / u_resolution;
    
    // Distance from light
    float dist = distance(xy, u_lightPos);
    
    // Basic falloff
    float attenuation = 1.0 - smoothstep(0.0, u_lightRadius, dist);
    
    // Add atmospheric noise (fog)
    float fog = fbm(xy * 0.005 + u_time * 0.5);
    
    // Combine
    float intensity = attenuation * (0.8 + 0.2 * fog);
    
    // Color: Warm gold/white light
    vec3 lightColor = vec3(1.0, 0.9, 0.7);
    
    // Ambient darkness (deep blue/purple)
    vec3 ambient = vec3(0.05, 0.05, 0.1);
    
    vec3 finalColor = mix(ambient, lightColor, intensity);
    
    // Alpha is 1.0 inside light, fades to 1.0 (we are drawing the background)
    // Actually, we want to draw a dark overlay that is cleared by light?
    // Or just draw the light itself?
    // Let's draw the "Atmosphere" layer.
    
    return vec4(finalColor, 1.0);
}
`)!;
