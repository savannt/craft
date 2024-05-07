const { vec3, mat4 } = glMatrix;


// create class that connects to websocket and waits for "reload" message, then reloads page
class LiveReload {
    constructor() {
        this.ws = new WebSocket("ws://localhost:3001");
        this.ws.onmessage = (event) => {
            if (event.data === "reload") {
                console.log("Reloading page...");
                location.reload();
            }
        };
    }
}
new LiveReload();








// on window load
window.onload = () => {
    console.log = (function(oldLog) {
        let logsElement = document.getElementById("logs");
        let lineCount = 0;
        const MAX_LINES = 15;

        return function() {
            const message = Array.from(arguments).map(arg => {
                return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg;
            }).join(" ");

            // Clip beyond MAX_LINES
            if (lineCount >= MAX_LINES) {
                logsElement.innerText = logsElement.innerText.substring(logsElement.innerText.indexOf("\n") + 1);
            }

            logsElement.innerText += message + "\n";
            lineCount++;
            oldLog.apply(console, arguments);
        };
    })(console.log);

    // if console error wrap message in span class="red"
    console.error = (function(oldError) {
        let logsElement = document.getElementById("logs");
        let lineCount = 0;
        const MAX_LINES = 15;

        return function() {
            const message = Array.from(arguments).map(arg => {
                return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg;
            }).join(" ");
            
            // Clip beyond MAX_LINES
            if (lineCount >= MAX_LINES) {
                logsElement.innerText = logsElement.innerText.substring(logsElement.innerText.indexOf("\n") + 1);
            }

            logsElement.innerHTML += `<span class="error">${message}</span>\n`;
            lineCount++;
            oldError.apply(console, arguments);
        };
    })(console.error);

    // Handle errors globally
    window.onerror = function(errorMsg, url, lineNumber) {
        console.error(`Error: ${errorMsg} in ${url} at line ${lineNumber}`);
        return false;
    };

    // WebGL and Camera Setup (assuming prior initializations)
    const app = new WebGLApp();
    app.init().then(() => app.startRenderLoop());
};

class Node {
    constructor(r = 255, g = 155, b = 0, a = 255, children = [false, false, false, false, false, false, false, false]) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a; // Initially used for opacity, will repurpose if needed
        this.children = children;
    }

    set(index, node) {
        return this.setChildren(index, node);
    }

    fill(callback) {
        for(let i = 0; i < this.children.length; i++) {
            let value = callback(i);
            if (!(value instanceof Node)) throw new Error("fill: Callback must return an instance of Node");
            this.setChildren(i, value);
        }
        return this;
    }

    setChildren(index, node) {
        if (!(node instanceof Node)) throw new Error("setChildren: Node must be an instance of Node");
        this.children[index] = node;
        return this;
    }

    randomColor() {
        this.r = Math.floor(Math.random() * 256);
        this.g = Math.floor(Math.random() * 256);
        this.b = Math.floor(Math.random() * 256);
        return this;
    }

    initialize3DTexture(gl) {
        const size = this.calculateTextureSize(); // Calculate needed texture size
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const data = new Float32Array(size * size * size * 4); // RGBA for each voxel
        this.flattenNode(data, 0);
        
        gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA32F, size, size, size, 0, gl.RGBA, gl.FLOAT, data);
        return texture;
    }

    flattenNode(data, startIndex) {
        let index = startIndex;
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i]) {
                // Store current node data
                data[index++] = this.r / 255.0;
                data[index++] = this.g / 255.0;
                data[index++] = this.b / 255.0;
                data[index++] = i + 1; // Store index of first child or -1 if leaf
                index = this.children[i].flattenNode(data, index); // Recursively flatten children
            }
        }
        return index; // Return new index position after processing all children
    }

    calculateTextureSize() {
        // A hypothetical function that calculates the texture size required
        // This should be determined based on the depth and branching factor of your tree
        return 32; // Example fixed size
    }
}


class ShaderHelper {
    static async getShaderSource(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader "${url}": ${response.status} ${response.statusText}`);
        }
        return response.text();
    }

    static createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
        function compileShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Error compiling shaders: " + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error("Failed to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    static setUniform(gl, program, uniform) {
        const location = gl.getUniformLocation(program, uniform.name);
        switch (uniform.type) {
            case "vec2":
                gl.uniform2fv(location, uniform.value);
                break;
            case "vec3":
                gl.uniform3fv(location, uniform.value);
                break;
            case "float":
                gl.uniform1f(location, uniform.value);
                break;
            case "texture":
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, uniform.value);
                gl.uniform1i(location, 0);
                break;
        }
    }
}

class BufferHelper {
    constructor(gl) {
        this.gl = gl;
    }

    createVertexBuffer(vertices) {
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        return vertexBuffer;
    }

    configureVertexAttributes(program, attributeInfo) {
        attributeInfo.forEach(info => {
            const location = this.gl.getAttribLocation(program, info.name);
            this.gl.enableVertexAttribArray(location);
            this.gl.vertexAttribPointer(
                location, info.size, this.gl.FLOAT, false,
                info.stride * Float32Array.BYTES_PER_ELEMENT,
                info.offset * Float32Array.BYTES_PER_ELEMENT
            );
        });
    }
}

class InputHandler {
    constructor(canvas) {
        this.keys = new Set();
        this.mouseDelta = { x: 0, y: 0 };
        this.zoomDelta = 0;
        this.bindEvents(canvas);
    }

    bindEvents(canvas) {
        document.addEventListener("keydown", e => this.keys.add(e.key));
        document.addEventListener("keyup", e => this.keys.delete(e.key));
        canvas.addEventListener("mousemove", e => {
            if (document.pointerLockElement === canvas) {
                this.mouseDelta.x += e.movementX;
                this.mouseDelta.y += e.movementY;
            }
        });
        canvas.addEventListener("click", () => canvas.requestPointerLock());
        canvas.addEventListener("wheel", e => this.zoomDelta += e.deltaY * 0.01);
    }

    isKeyPressed(key) {
        return this.keys.has(key);
    }

    getMouseMovement() {
        let movement = { ...this.mouseDelta };
        this.mouseDelta = { x: 0, y: 0 };
        return movement;
    }

    getZoom() {
        let zoom = this.zoomDelta;
        this.zoomDelta = 0;
        return zoom;
    }
}


class Camera {
    constructor() {
        this.position = vec3.fromValues(0, 0, 0);
        this.direction = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0, 1, 0);
        this.right = vec3.fromValues(1, 0, 0);
        this.fov = 90;
        this.aspectRatio = 1;
    }

    update(inputHandler, deltaTime) {
        const speed = 0.05 * deltaTime;
        const sensitivity = 0.001 * deltaTime;
        let moveDirection = vec3.create();

        if (inputHandler.isKeyPressed("w")) vec3.add(moveDirection, moveDirection, this.direction);
        if (inputHandler.isKeyPressed("s")) vec3.subtract(moveDirection, moveDirection, this.direction);
        if (inputHandler.isKeyPressed("d")) vec3.add(moveDirection, moveDirection, this.right);
        if (inputHandler.isKeyPressed("a")) vec3.subtract(moveDirection, moveDirection, this.right);
        if (inputHandler.isKeyPressed("e")) vec3.add(moveDirection, moveDirection, this.up);
        if (inputHandler.isKeyPressed("q")) vec3.subtract(moveDirection, moveDirection, this.up);

        vec3.normalize(moveDirection, moveDirection);
        vec3.scaleAndAdd(this.position, this.position, moveDirection, speed);

        const mouseMove = inputHandler.getMouseMovement();
        const deltaYaw = -mouseMove.x * sensitivity;
        const deltaPitch = -mouseMove.y * sensitivity;

        const rotationMatrix = mat4.create();
        mat4.rotateY(rotationMatrix, rotationMatrix, deltaYaw);
        mat4.rotate(rotationMatrix, rotationMatrix, deltaPitch, this.right);

        vec3.transformMat4(this.direction, this.direction, rotationMatrix);
        vec3.transformMat4(this.up, this.up, rotationMatrix);
        vec3.normalize(this.direction, this.direction);
        vec3.normalize(this.up, this.up);

        this.fov += inputHandler.getZoom();
        this.fov = Math.max(45, Math.min(this.fov, 120));
    }

    getUniforms() {
        return [
            { name: "cameraPosition", type: "vec3", value: this.position },
            { name: "cameraDirection", type: "vec3", value: this.direction },
            { name: "cameraUp", type: "vec3", value: this.up },
            { name: "cameraRight", type: "vec3", value: vec3.cross(vec3.create(), this.direction, this.up) },
            { name: "fov", type: "float", value: this.fov },
            { name: "resolution", type: "vec2", value: [window.innerWidth, window.innerHeight] },
            { name: "aspectRatio" , type: "float", value: window.innerWidth / window.innerHeight },
        ];
    }
}

class WebGLApp {
    constructor() {
        this.canvas = document.getElementById("webgl-canvas");
        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl) {
            console.error("WebGL2 not supported");
            return;
        }
        this.shaderHelper = new ShaderHelper();
        this.bufferHelper = new BufferHelper(this.gl);
        this.inputHandler = new InputHandler(this.canvas);
        this.camera = new Camera();
        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());


        this.fpsElement = document.getElementById("fps");
        this.frames = 0;
        this.lastFpsUpdate = Date.now();
        this.fps = 0;

        

        this.fullscreenBuffer = this.bufferHelper.createVertexBuffer([
            -1.0,  1.0,  0.0,  // Top-left corner
            1.0,  1.0,  0.0,  // Top-right corner
           -1.0, -1.0,  0.0,  // Bottom-left corner
           -1.0, -1.0,  0.0,  // Bottom-left corner
            1.0,  1.0,  0.0,  // Top-right corner
            1.0, -1.0,  0.0   // Bottom-right corner
        ]);



        // must be true to run
        this.initialized = false;
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.camera.aspectRatio = this.canvas.width / this.canvas.height;
    }

    async init () {
        const node = new Node().randomColor();
        node.fill(() => new Node().randomColor());

        await this._initShaders();
        this.texture = node.initialize3DTexture(this.gl);

        this.initialized = true;
    }


    // initialize3DTexture(node) {
    //     const gl = this.gl;
    //     const texture = gl.createTexture();
    //     gl.bindTexture(gl.TEXTURE_3D, texture);
    
    //     const size = 32; // Example size of each dimension

    //     const texturesData = node.toTexturesArray(); 
    //     const textureData = texturesData[0];

    //     // Allocate data array for floats
    //     const data = new Float32Array(size * size * size * 4);

    //     // Populate data array
    //     for (let i = 0; i < size * size * size; i++) {
    //         const index = i * 4;
    //         const textureData = texturesData[0][i];
    //         if(textureData) {
    //             data[index + 0] = textureData.r / 255.0; // Convert from 0-255 to 0.0-1.0
    //             data[index + 1] = textureData.g / 255.0;
    //             data[index + 2] = textureData.b / 255.0;
    //             data[index + 3] = textureData.a / 8.0;
    //         } else {
    //             data[index + 0] = null;
    //             data[index + 1] = null;
    //             data[index + 2] = null;
    //             data[index + 3] = null;
    //         }
    //     }


    //     // Set the texture parameters
    //     gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    //     // Upload the data to the GPU
    //     gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA32F, size, size, size, 0, gl.RGBA, gl.FLOAT, data);
        
    //     return texture;
    // }
    



    async _initShaders() {
        const vertexShaderSource   = await ShaderHelper.getShaderSource("vertexShader.glsl");
        const fragmentShaderSource = await ShaderHelper.getShaderSource("fragmentShader.glsl");
        this.shaderProgram = ShaderHelper.createShaderProgram(this.gl, vertexShaderSource, fragmentShaderSource);
        
        
        this.bufferHelper.configureVertexAttributes(this.shaderProgram, [
            { name: "position", size: 3, stride: 3, offset: 0 }
            // { name: "texturePosition", size: 2, stride: 2, offset: 0 }
        ]);
    }

    _render() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shaderProgram);
        this.camera.getUniforms().forEach(uniform => {
            // console.log(uniform.name, uniform.value);
            ShaderHelper.setUniform(this.gl, this.shaderProgram, uniform);
        });




        this.gl.activeTexture
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, "uVoxelTexture"), 0);



        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fullscreenBuffer);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);


        this.frames++;
        const now = Date.now();
        if(now - this.lastFpsUpdate > 1000) {
            this.fps = this.frames;
            this.frames = 0;
            this.lastFpsUpdate = now;
            if(this.fpsElement) this.fpsElement.innerText = this.fps;
        }
    }



    startRenderLoop() {
        if(!this.initialized) {
            console.error("App not initialized");
            return;
        }

        let lastFrame = Date.now();
        const renderLoop = () => {
            const now = Date.now();
            const deltaTime = now - lastFrame;
            lastFrame = now;

            this.camera.update(this.inputHandler, deltaTime);
            this._render();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }
}