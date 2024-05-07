#version 300 es
precision highp float;

uniform vec3 cameraPosition;
uniform vec3 cameraDirection;
uniform float fov;
uniform vec2 resolution;
uniform float aspectRatio;

out vec4 fragColor;


mat2 rot(float spin) {
    return mat2(cos(spin), sin(spin), -sin(spin), cos(spin));
}

// Sphere SDF
float sphereSDF(vec3 point, vec3 center, float radius) {
    return length(point - center) - radius;
}

// Box SDF
float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

// Get voxel type
int getVoxel(vec3 p, float size) {
    // float d = min(max(-sphereSDF(p, vec3(0.0), 0.218), sdBox(p, vec3(0.15))), -sphereSDF(p, vec3(0.0), 0.5));
    
    // render only sphere
    float d = -sphereSDF(p, vec3(0.0), 0.1);

    
    return int(d < size * 1.73205080757); // approximation of sqrt(3) for cube diagonal
}

vec3 voxel(vec3 ro, vec3 rd, vec3 ird, float size) {
    size *= 0.5; return -(sign(rd)*(ro-size)-size)*ird;
}


// Main ray marching function
vec4 rayMarch(vec3 ro, vec3 rd, float minDist, float maxDist, int maxSteps) {

    /*
    Implement the following code:

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    int i, j; vec3 sp; int spc = samples;

    for (j = 0; j < spc*spc; j++) {
    float d = 1./float(spc);
    vec2 spv = vec2(float(j%spc)*d-0.5, float(j/spc)*d-0.5);
    vec2 uv = ((fragCoord.xy+spv) * 2.0 - iResolution.xy) /iResolution.y;
    float size=1.;
    vec3 ro = vec3(0.4*sin(iTime), 0, 0.4*cos(iTime)), rd = normalize(vec3(uv,1.0));
    //rd.yz *= rot(0.304085*pi-pi*0.5); rd.xz *= rot(0.375*pi*2.0-pi);
    float x = mod(iMouse.x/iResolution.x+0.5,1.), y = mod(iMouse.y/iResolution.y+0.5,1.);
    rd.yz *= rot(y*pi-pi*0.5); rd.xz *= rot(iTime-pi); rd.xz *= rot(x*pi*2.0-pi);
    
    vec3 lro = mod(ro,size), fro = ro-lro;
    vec3 ird = 1.0/max(abs(rd),0.001), mask;
    bool exit = false; int recursions = 0;
    float dist = 0.0, fdist = 0.0; vec3 lastmask;
    
    for (i = 0; i < steps; i++) {
        if (dist > maxdistance) { break; }
        if (exit) {
            vec3 newfro = floor(fro/(size*2.0))*(size*2.0);
            lro += fro-newfro;
            fro = newfro;
            recursions--;
            size *= 2.0;
            exit = (recursions > 0) && (abs(dot(mod(fro/size+0.5,2.0)-1.0+mask*sign(rd)*0.5,mask))<0.1);
            continue;
        } int v = getvoxel(fro, size);
        if (v == 1 && recursions >= detail) { v = 2; }
        if (v == 1) {
            recursions++;
            size *= 0.5;
            //find which of the 8 voxels i will enter
            vec3 mask2 = step(vec3(size),lro);
            fro += mask2*size;
            lro -= mask2*size;
        } else if (v==2) { break; } else { //move forward
            //raycast and find distance to nearest voxel surface in ray direction
            //i don't need to use voxel() every time, but i do anyway
            vec3 hit = voxel(lro, rd, ird, size);

            if (hit.x < min(hit.y,hit.z)) { mask = vec3(1,0,0); }
            else if (hit.y < hit.z) { mask = vec3(0,1,0); }
            else { mask = vec3(0,0,1); }

            //moving forward in ray direction, and checking if i need to go up a level
            float len = dot(hit,mask);
            dist += len;
            fdist += len;
            lro += rd*len-mask*sign(rd)*size;
            vec3 newfro = fro+mask*sign(rd)*size;
            exit = (floor(newfro/size*0.5+0.25)!=floor(fro/size*0.5+0.25))&&(recursions>0);
            fro = newfro; lastmask = mask;
        }
    }
    if (dist > maxdistance) { sp += vec3(0,opacity,0); }
    else if(i < steps) {
        vec3 color = vec3(1);//sin(val*vec3(39.896,57.3225,48.25))*0.5+0.5;
        vec3 normal = -lastmask*sign(rd);
        //vec3 light = normalize(vec3(-1,0.1,0.1));
        sp += sqrt(color*0.3 + normal*0.7)*opacity;
        //sp += sqrt(color*0.3 + max(color*0.7*(dot(normal, light)), 0.0))*opacity;
    } else { sp += vec3(1,0,0); }
    } fragColor = vec4(sp/float(spc*spc),1);
}

    */

    vec4 fragColor;
    int i, j; vec3 sp; int spc = 1;

    for (j = 0; j < spc*spc; j++) {
        float d = 1./float(spc);
        vec2 spv = vec2(float(j%spc)*d-0.5, float(j/spc)*d-0.5);
        vec2 uv = ((gl_FragCoord.xy+spv) * 2.0 - resolution) / resolution.y;
        float size=1.;
        vec3 ro = vec3(0.4*sin(0.0), 0, 0.4*cos(0.0)), rd = normalize(vec3(uv,1.0));
        //rd.yz *= rot(0.304085*pi-pi*0.5); rd.xz *= rot(0.375*pi*2.0-pi);
        float x = mod(0.0+0.5,1.), y = mod(0.0+0.5,1.);
        rd.yz *= rot(y*3.14159265359-3.14159265359*0.5); rd.xz *= rot(0.0-3.14159265359); rd.xz *= rot(x*3.14159265359*2.0-3.14159265359);
        
        vec3 lro = mod(ro,size), fro = ro-lro;
        vec3 ird = 1.0/max(abs(rd),0.001), mask;
        bool exit = false; int recursions = 0;
        float dist = 0.0, fdist = 0.0; vec3 lastmask;
        
        for (i = 0; i < 100; i++) {
            if (dist > 100.0) { break; }
            if (exit) {
                vec3 newfro = floor(fro/(size*2.0))*(size*2.0);
                lro += fro-newfro;
                fro = newfro;
                recursions--;
                size *= 2.0;
                exit = (recursions > 0) && (abs(dot(mod(fro/size+0.5,2.0)-1.0+mask*sign(rd)*0.5,mask))<0.1);
                continue;
            } int v = getVoxel(fro, size);
            if (v == 1 && recursions >= 1) { v = 2; }
            if (v == 1) {
                recursions++;
                size *= 0.5;
                //find which of the 8 voxels i will enter
                vec3 mask2 = step(vec3(size),lro);
                fro += mask2*size;
                lro -= mask2*size;
            } else if (v==2) { break; } else { //move forward
                //raycast and find distance to nearest voxel surface in ray direction
                //i don't need to use voxel() every time, but i do anyway
                vec3 hit = voxel(lro, rd, ird, size);

                if (hit.x < min(hit.y,hit.z)) { mask = vec3(1,0,0); }
                else if (hit.y < hit.z) { mask = vec3(0,1,0); }
                else { mask = vec3(0,0,1); }

                //moving forward in ray direction, and checking if i need to go up a level
                float len = dot(hit,mask);
                dist += len;
                fdist += len;
                lro += rd*len-mask*sign(rd)*size;
                vec3 newfro = fro+mask*sign(rd)*size;
                exit = (floor(newfro/size*0.5+0.25)!=floor(fro/size*0.5+0.25))&&(recursions>0);
                fro = newfro; lastmask = mask;
            }
        }
        if (dist > 100.0) { sp += vec3(0,1,0); }
        else if(i < 100) {
            vec3 color = vec3(1);//sin(val*vec3(39.896,57.3225,48.25))*0.5+0.5;
            vec3 normal = -lastmask*sign(rd);
            //vec3 light = normalize(vec3(-1,0.1,0.1));
            sp += sqrt(color*0.3 + normal*0.7)*1.0;
            //sp += sqrt(color*0.3 + max(color*0.7*(dot(normal, light)), 0.0))*opacity;
        } else { sp += vec3(1,0,0); }
    } fragColor = vec4(sp/float(spc*spc),1);

    return fragColor;
}

// Main image function
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    uv.x *= aspectRatio;

    // Camera setup
    vec3 forward = normalize(cameraDirection);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));  // Assuming Y is up
    vec3 up = cross(right, forward);

    // Adjust ray direction for field of view
    float tanFov = tan(fov * 0.5);
    vec3 rayDir = normalize(forward + uv.x * right * tanFov + uv.y * up * tanFov);

    // Ray marching parameters
    float minDist = 0.1;
    float maxDist = 100.0;
    int maxSteps = 100;

    // Perform ray marching
    vec4 color = rayMarch(cameraPosition, rayDir, minDist, maxDist, maxSteps);

    // Output final color
    fragColor = color;
}
