//! Build instructions (Rust + WASM):
//! 1. Install `wasm-pack` once: `cargo install wasm-pack`.
//! 2. From the repository root run `wasm-pack build --target bundler --release --out-dir pkg`.
//! 3. Point your bundler (Vite, Webpack, etc.) at the generated `pkg/` folder and import it as `det_math_wasm`.

use wasm_bindgen::prelude::*;

type Scalar = f64;

#[wasm_bindgen]
pub struct Vec3 {
    x: Scalar,
    y: Scalar,
    z: Scalar,
}

impl Vec3 {
    fn cross(&self, other: &Vec3) -> Vec3 {
        Vec3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }
}

#[wasm_bindgen]
impl Vec3 {
    #[wasm_bindgen(constructor)]
    pub fn new(x: Scalar, y: Scalar, z: Scalar) -> Vec3 {
        Vec3 { x, y, z }
    }

    pub fn x(&self) -> Scalar {
        self.x
    }

    pub fn y(&self) -> Scalar {
        self.y
    }

    pub fn z(&self) -> Scalar {
        self.z
    }

    pub fn add(&mut self, other: &Vec3) {
        self.x += other.x;
        self.y += other.y;
        self.z += other.z;
    }

    pub fn scale(&mut self, s: Scalar) {
        self.x *= s;
        self.y *= s;
        self.z *= s;
    }

    pub fn length(&self) -> Scalar {
        libm::sqrt(self.x * self.x + self.y * self.y + self.z * self.z)
    }

    pub fn normalize(&mut self) {
        let len = self.length();
        if len == 0.0 {
            return;
        }
        let inv = 1.0 / len;
        self.scale(inv);
    }
}

#[wasm_bindgen]
pub struct Quat {
    x: Scalar,
    y: Scalar,
    z: Scalar,
    w: Scalar,
}

#[wasm_bindgen]
impl Quat {
    pub fn new_identity() -> Quat {
        Quat {
            x: 0.0,
            y: 0.0,
            z: 0.0,
            w: 1.0,
        }
    }

    pub fn from_axis_angle(axis: &Vec3, angle: Scalar) -> Quat {
        let half = angle * 0.5;
        let sin_half = libm::sin(half);
        let cos_half = libm::cos(half);
        Quat {
            x: axis.x * sin_half,
            y: axis.y * sin_half,
            z: axis.z * sin_half,
            w: cos_half,
        }
    }

    pub fn mul_assign(&mut self, other: &Quat) {
        let x = self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y;
        let y = self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x;
        let z = self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w;
        let w = self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z;
        self.x = x;
        self.y = y;
        self.z = z;
        self.w = w;
    }

    pub fn rotate_vec3(&self, v: &Vec3) -> Vec3 {
        let q_vec = Vec3 {
            x: self.x,
            y: self.y,
            z: self.z,
        };
        let mut uv = q_vec.cross(v);
        let mut uuv = q_vec.cross(&uv);
        uv.scale(2.0 * self.w);
        uuv.scale(2.0);
        Vec3 {
            x: v.x + uv.x + uuv.x,
            y: v.y + uv.y + uuv.y,
            z: v.z + uv.z + uuv.z,
        }
    }
}

#[wasm_bindgen]
pub fn make_normalized_vec3(x: Scalar, y: Scalar, z: Scalar) -> Vec3 {
    let mut v = Vec3 { x, y, z };
    v.normalize();
    v
}

#[wasm_bindgen]
pub fn dm_sin(x: Scalar) -> Scalar {
    libm::sin(x)
}

#[wasm_bindgen]
pub fn dm_cos(x: Scalar) -> Scalar {
    libm::cos(x)
}

#[wasm_bindgen]
pub fn dm_atan2(y: Scalar, x: Scalar) -> Scalar {
    libm::atan2(y, x)
}

#[wasm_bindgen]
pub fn dm_sqrt(x: Scalar) -> Scalar {
    libm::sqrt(x)
}
