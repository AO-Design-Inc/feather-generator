import {mat2, mat3, mat4, vec2, vec3, vec4} from './gl-matrix-3.3.0/src/index.js'
import DoublyLinkedList from './libs/doublyLinkedList.js'
import { Point, Bezier, QuadSpline, BSpline, Screen, Pen} from './libs/drawing.js'

const canvas = document.getElementById("canvas")
const ctx = canvas.getContext('2d')

// this gets quadratic spline with matrix calcs
//const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;
/*
const quadBezFirstMatrix = mat3.fromValues(2, -3, 1, -4, 4,0 , 2, 0, 0)
const quadBezLastMatrix = mat3.fromValues(1, -3, 2, -2, 2, 0, 1, 1, 0)
const quadBezMidMatrix = mat3.fromValues(1, -2, 1, -2, 2, 0, 1, 1, 0)

function quadSplineFromThreeControlPoints(p1, p2, p3, pos='mid') {
  let vectorMatrix = mat3.fromValues(...p1,0, ...p2,0, ...p3,0)
  let tempMatrix = mat3.create()
  let resultVec = vec2.create()
  let quadBezMatrix = 
    pos == 'first' ? quadBezFirstMatrix :
    pos == 'last' ? quadBezLastMatrix : quadBezMidMatrix
    
  return (t) => {
    let tvec = vec3.fromValues(t*t, t, 1)
    mat3.multiply(tempMatrix, vectorMatrix, quadBezMatrix)
    vec3.transformMat3(tvec,tvec, tempMatrix)
    vec3.scale(tvec,tvec,0.5)
    return tvec
  }
}
*/

const backgroundColor = `rgb(255,255,255)`
const foregroundColor = 'black'
const genParams = {
  "Rlength":500,
  "Rgens": 100,
  "R_start_x": 500,
  "R_start_y": 200,
  "Bl_length": 100,
  "Bl_gens": 100,
  "Br_length": 100,
  "Br_gens": 100,
  "Rand_angle_op":0.3,
  "Br_start_angle":0,
  "Bl_start_angle":Math.PI,
  "R_start_angle": Math.PI/2,
  "Force_external_max": 3,
  "Force_external_min": 0.1,
  "Force_L_threshold": 0.3,
  "Force_R_threshold": 1,
  "bound_path": new Path2D(),
  get R_end_x() {return this.R_start_x },
  get R_end_y() {return this.R_start_y + this.Rlength},
  get R_draw_iter() {return this.Rlength/this.Rgens},
  get Force_external_range() {
    return this.Force_external_max - this.Force_external_min },
  get Force_external_gen() {
    return this.Force_external_min + Math.random()*this.Force_external_range },
}

const getIterLength = (n_iters, total_len) => total_len/n_iters


function Rgen(boundPath) {
  const rpen = new Pen(
    genParams.R_start_x,
    genParams.R_start_y,
    genParams.R_start_angle,
    ctx)
    return function R(index, Fl=0, Fr=0, Rangle=genParams.Br_start_angle, Langle=genParams.Bl_start_angle) {
      if (index < genParams.Rgens) {
        rpen.draw(genParams.R_draw_iter)
        Blgen(rpen.x,rpen.y,Rangle,Fl, boundPath)(0)
        Brgen(rpen.x,rpen.y,Langle,Fr, boundPath)(0)
        return R(index+1,
          Fl < genParams.Force_L_threshold ? 
          Fl + genParams.Force_external_gen :
          0,
          Fr < genParams.Force_R_threshold ?
          Fr + genParams.Force_external_gen :
          0,
          Fr ? Rangle : Rangle + (Math.random()-0.5)*genParams.Rand_angle_op,
          Fl ? Langle : Langle + (Math.random()-0.5)*genParams.Rand_angle_op
          )
      } else {
        rpen.render()
      }
    }

}

function Blgen(x,y,cur_angle, Fl, boundPath) {
  const blpen = new Pen(
    x,
    y,
    cur_angle,
    ctx
  )
  return function Bl(index) {
    if (
      index < genParams.Bl_gens && blpen.boundsCheck(boundPath)
      ) {
        blpen.draw(getIterLength(genParams.Bl_gens, genParams.Bl_length))
        return Bl(index+1)
      } else {
        blpen.render()
      }
  }
}

function Brgen(x,y,cur_angle, Fl, boundPath) {
  const brpen = new Pen(
    x,
    y,
    cur_angle,
    ctx
  )
  return function Br(index) {
    if (
      index < genParams.Br_gens && brpen.boundsCheck(boundPath)
      ) {
        brpen.draw(getIterLength(genParams.Br_gens, genParams.Br_length))
        return Br(index+1)
      } else {
        brpen.render()
      }
  }
}



const bezierLeft = new BSpline(
  new Point(genParams.R_start_x, genParams.R_start_y),
  new Point(
    (genParams.R_start_x + genParams.R_end_x)/3,
    (genParams.R_start_y + genParams.R_end_y)/3
  ),
  new Point(
    (genParams.R_start_x + genParams.R_end_x)/3,
    (genParams.R_start_y + genParams.R_end_y)*(2/3)
  ),
  new Point(genParams.R_end_x, genParams.R_end_y)
)

const bezierRight = new BSpline(
  new Point(genParams.R_start_x, genParams.R_start_y),
  new Point(
    (genParams.R_start_x + genParams.R_end_x)*(2/3),
    (genParams.R_start_y + genParams.R_end_y)/3
  ),
  new Point(
    (genParams.R_start_x + genParams.R_end_x)*(2/3),
    (genParams.R_start_y + genParams.R_end_y)*(2/3)
  ),
  new Point(genParams.R_end_x, genParams.R_end_y)
)


const screen = new Screen(canvas)
screen.attachRenderableObjects(bezierLeft,
 ...bezierLeft.splines.map((_) => _.controlPoints).flat(),
 bezierRight, ...bezierRight.splines.map((_) => _.controlPoints).flat())
screen.renderAndDraw()


const arrCtrlPoints = () => [
  ...bezierLeft.splines.map((_) => _.controlPoints).flat(),
  ...bezierRight.splines.map((_) => _.controlPoints).flat()
]

let selectedPoint


canvas.addEventListener('mousedown', e => {
  const x = e.offsetX;
  const y = e.offsetY;
  const point = new Point(x,y)
  if (e.ctrlKey) {
    selectedPoint = arrCtrlPoints().find((ctrlPoint) =>
      screen.ctx.isPointInPath(ctrlPoint.path, x, y)
    ) ?? selectedPoint
  } else if (e.shiftKey) {
    if(x < genParams.R_start_x) {
    bezierLeft.addControlPoint(point)
    } else {
      bezierRight.addControlPoint(point)
    }
    screen.attachRenderableObjects(point)
    screen.renderAndDraw()
  } else if (selectedPoint) {
    selectedPoint.coords = [x,y]
    //renderBezierAndClearPrevious(ctx, bezierLeft)
    screen.renderAndDraw()
  }
});




const button = document.getElementById("renderButton")
//const featherPath = new Path2D()
let featherPath
button.onclick = () => {
  featherPath = screen.renderAndDraw()
  //featherPath.addPath(screen.renderAndDraw())
  //ctx.fill(featherPath)
  const R = Rgen(featherPath)
  R(0)
  console.log("OK!")
}

