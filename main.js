'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightPositionEl;
let tex;
let tex1; 
let video;
let track
let background;

const userPoint = { x: 100, y: 100 };

const r = parseFloat(1.0);
const a = parseFloat(0.5);
const n = parseInt(300);

const uDel = 0.001;
const vDel = 0.001;

function deg2rad(angle) {
  return angle * Math.PI / 180;
}

function URestrictions(u) {
  return u * Math.PI * 12;
}

function VRestrictions(v) {
  return v * Math.PI * 2;
}

function xFunction(v, u) {
  return (
    (r + a * Math.cos(u / 2)) * Math.cos(u / 3) +
    a * Math.cos(u / 3) * Math.cos(v - Math.PI)
  );
}

function yFunction(v, u) {
  return (
    (r + a * Math.cos(u / 2)) * Math.sin(u / 3) +
    a * Math.sin(u / 3) * Math.cos(v - Math.PI)
  );
}

function zFunction(v, u) {
  return a + Math.sin(u / 2) + a * Math.sin(v - Math.PI);
}

function derUFunc(u, v, uDelta) {
  let x = xFunction(u, v);
  let y = yFunction(u, v);
  let z = zFunction(u, v);

  let Dx = xFunction(u + uDelta, v);
  let Dy = yFunction(u + uDelta, v);
  let Dz = zFunction(u + uDelta, v);

  let Dxdu = (Dx - x) / deg2rad(uDelta);
  let Dydu = (Dy - y) / deg2rad(uDelta);
  let Dzdu = (Dz - z) / deg2rad(uDelta);

  return [Dxdu, Dydu, Dzdu];
}

function derVFunc(u, v, vDelta) {
  let x = xFunction(u, v);
  let y = yFunction(u, v);
  let z = zFunction(u, v);

  let Dx = xFunction(u, v + vDelta);
  let Dy = yFunction(u, v + vDelta);
  let Dz = zFunction(u, v + vDelta);

  let Dxdv = (Dx - x) / deg2rad(vDelta);
  let Dydv = (Dy - y) / deg2rad(vDelta);
  let Dzdv = (Dz - z) / deg2rad(vDelta);

  return [Dxdv, Dydv, Dzdv];
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textureList) {

    this.count = vertices.length / 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureList), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);


  }
  this.Draw = function () {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
  this.DrawBG = function () {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }


}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  // Normals
  this.iNormal = -1;
  this.iNormalMatrix = -1;

  // Ambient, diffuse, specular
  this.iAmbientColor = -1;
  this.iDiffuseColor = -1;
  this.iSpecularColor = -1;

  // Shininess
  this.iShininess = -1;

  // Light position
  this.iLightPos = -1;
  this.iLightVec = -1;

  // TextureCoords
  this.iTextureCoords = -1;
  this.iTMU = -1;

  this.iFAngleRad = -1;
  this.iFUserPoint = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  let D = document;
  let spans = D.getElementsByClassName("sliderValue");

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  // let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
  let projection = m4.orthographic(0, 1, 0, 1, -1, 1);
  let conv, // convergence
    eyes, // eye separation
    ratio, // aspect ratio
    fov; // field of view
  conv = 2000.0;
  conv = D.getElementById("conv").value;
  spans[3].innerHTML = conv;

  eyes = 70.0;
  eyes = D.getElementById("eyes").value;
  spans[0].innerHTML = eyes;

  ratio = 1.0;
  fov = 2.2;
  fov = D.getElementById("fov").value;
  spans[1].innerHTML = fov;
  
  let top, bottom, left, right, near, far;
  near = 10.0;

  near = D.getElementById("near").value - 0.0;
  spans[2].innerHTML = near;
  far = 20000.0;

  top = near * Math.tan(fov / 2.0);
  bottom = -top;

  let a = ratio * Math.tan(fov / 2.0) * conv;

  let b = a - eyes / 2;
  let c = a + eyes / 2;

  left = -b * near / conv;
  right = c * near / conv;

  // console.log(left, right, bottom, top, near, far);

  let projectionLeft = m4.frustum(left, right, bottom, top, near, far);

  left = -c * near / conv;
  right = b * near / conv;

  let projectionRight = m4.frustum(left, right, bottom, top, near, far);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  let translateToPointZero = m4.translation(0.0, 0, 0.0);
  let translateToLeft = m4.translation(-0.03, 0, -20);
  let translateToRight = m4.translation(0.03, 0, -20);

  let matAccum = m4.multiply(rotateToPointZero, modelView);
  let noRot = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  let matAccum1 = m4.multiply(translateToPointZero, noRot);
  let modelViewProjection = m4.multiply(projection, matAccum1);
  const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  // let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  const lightPos = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value);
  gl.uniform3fv(shProgram.iLightPos, lightPos);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

  gl.uniform1f(shProgram.iShininess, 1.0);

  gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.1, 0.0]);
  gl.uniform3fv(shProgram.iDiffuseColor, [0.5, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [0.5, 1.0, 1.0]);

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 1]);

  const angle = 100;
  gl.uniform1f(shProgram.iFAngleRad, deg2rad(+angle));

  const uRad = deg2rad(userPoint.x);
  const vRad = deg2rad(userPoint.y);

  gl.uniform2fv(shProgram.iFUserPoint, [
    (a + vRad * Math.cos(deg2rad(30)) + c * (vRad * vRad) * Math.sin(deg2rad(30))) * Math.cos(uRad),
    (a + vRad * Math.cos(deg2rad(30)) + c * (vRad * vRad) * Math.sin(deg2rad(30))) * Math.sin(uRad)
  ]);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRot);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video
    );
  background.DrawBG();
  gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTMU, 0);
  
  gl.bindTexture(gl.TEXTURE_2D,  tex1);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  // surface.Draw();
  let matAccumLeft = m4.multiply(translateToLeft, matAccum);
  let matAccumRight = m4.multiply(translateToRight, matAccum);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

  gl.colorMask(true, true, true, true);
}

function CreateSurfaceData() {
  let normals = [];
  let vertices = [];

  const scale = 3;

  for (let j = 0; j <= n; j += 1) {
    let u1 = j / n;

    for (let i = 0; i <= n; i += 1) {
      let v1 = i / n;
      let u = URestrictions(u1);
      let v = VRestrictions(v1);

      let x = xFunction(v, u);
      let y = yFunction(v, u);
      let z = zFunction(v, u);

      vertices.push(x * scale, y * scale, z * scale); 

      x = xFunction(v, u + 1);
      y = yFunction(v, u + 1);
      z = zFunction(v, u + 1);

      vertices.push(x* scale, y * scale, z * scale); 

      let derU = derUFunc(u, v, uDel);
      let derV = derVFunc(u, v, vDel);

      let result = m4.cross(derV, derU);
      normals.push(result[0]);
      normals.push(result[1]);
      normals.push(result[2]);

      derU = derUFunc(u + 1, v, uDel);
      derV = derVFunc(u + 1, v, vDel);

      result = m4.cross(derV, derU);
      normals.push(result[0]);
      normals.push(result[1]);
      normals.push(result[2]);
    }
  }


  return [
    vertices,
    normals,
  ];
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMat');

  shProgram.iAmbientColor = gl.getUniformLocation(prog, 'ambientColor');
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, 'diffuseColor');
  shProgram.iSpecularColor = gl.getUniformLocation(prog, 'specularColor');
  shProgram.iColor = gl.getUniformLocation(prog, 'colorU');

  shProgram.iShininess = gl.getUniformLocation(prog, 'shininess');

  shProgram.iLightPos = gl.getUniformLocation(prog, 'lightPosition');
  shProgram.iLightVec = gl.getUniformLocation(prog, 'lightVec');
  // TEXTURE
  shProgram.iTextureCoords = gl.getAttribLocation(prog, 'textureCoords');
  shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

  shProgram.iFAngleRad = gl.getUniformLocation(prog, 'fAngleRad');
  shProgram.iFUserPoint = gl.getUniformLocation(prog, 'fUserPoint');

  surface = new Model('Surface');
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(CreateSurfaceData()[0], CreateSurfaceData()[1]);
  background = new Model('Back');
  background.BufferData([0.0,0.0,0.0,1.0,0.0,0.0,1.0,1.0,0.0,1.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0],[1,1,0,1,0,0,0,0,1,0,1,1]);

  LoadTexture();

  gl.enable(gl.DEPTH_TEST);
}
function continiousDraw(){
  draw()
  window.requestAnimationFrame(continiousDraw);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  lightPositionEl = document.getElementById('lightPostion');

  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    getWebcam();
    tex = CreateWebCamTexture();
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  // draw();
  continiousDraw()
}

function reDraw() {
  surface.BufferData(CreateSurfaceData()[0], CreateSurfaceData()[1]);
  draw();
}

const LoadTexture = () => {
  const image = new Image();
  image.src = 'https://www.the3rdsequence.com/texturedb/download/257/texture/jpg/256/green+moss-256x256.jpg';
  image.crossOrigin = 'anonymous';


  image.addEventListener('load', () => {
    tex1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
}

window.addEventListener('keydown', function (event) {
  switch (event.code) {
    case 'ArrowUp':
      userPoint.y = userPoint.y + 1;
      break;
    case 'ArrowDowm':
      userPoint.y = userPoint.y - 1;
      break;
    case 'ArrowRight':
      userPoint.x = userPoint.x + 1;
      break;
    case 'ArrowLeft':
      userPoint.x = userPoint.x - 1;
      break;
  }

  reDraw();
});

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function (stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function (e) {});
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}