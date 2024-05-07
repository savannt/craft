/*


* 1:1 Bounding Box


*/


class Object {

    constructor(scale = 1.0) {
        this.scale = scale;
        this.width = scale;
        this.height = scale;
    }

    add (object, offsetX, offsetY, offsetZ) {

    }

    subtract (object, offsetX, offsetY, offsetZ) {

    }

}


class Cube extends Object {
    constructor (scale) {
        super(scale);
    }

    onGenerate ()
}


const sphereObject = new Sphere(1.0);
const smallCube    = new Cube(0.5);
const collection   = new Collection().add(sphereObject).subtract(smallCube, 1.0, 1.0, 1.0);








// RGB are the colors,
// Alpha is the number of children




class Node {
    constructor(r = 255, g = 155, b = 0, a = 255, children = []) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.children = children;
    }

    toTexturesArray () {
        let textures = [[], []];
        textures[0].push({
            r: this.r,
            g: this.g,
            b: this.b,
            a: this.children.length
        });
        textures[1].push({
            r: this.a,
            a: this.children.length
        });
        for (let i = 0; i < this.children.length; i++) {
            let _textures = this.children[i].toTexturesArray();
            textures[0] = textures[0].concat(_textures[0]);
            textures[1] = textures[1].concat(_textures[1]);
        }
        return textures;
    }
}