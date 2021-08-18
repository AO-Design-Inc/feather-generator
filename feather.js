const canvas = document.getElementById("canvas")
const ctx = canvas.getContext('2d')

// this gets quadratic spline with matrix calcs
const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;
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
class Pen {
  constructor(x,y,angle,ctx) {
    this.x = x
    this.y = y
    this.angle = angle
    this.path = new Path2D()
    this.path.moveTo(x,y)
  }

  draw(length) {
    const newx = this.x + Math.cos(this.angle) * length
    const newy = this.y + Math.sin(this.angle) * length
    this.path.lineTo(newx,newy)
    this.x = newx
    this.y = newy
  }

  render() {
    ctx.stroke(this.path)
  }

  boundsCheck(boundPath) {
    return ctx.isPointInPath(boundPath, this.x, this.y)
  }
}


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

class Point {
  constructor(x,y) {
    this.path = new Path2D()
    this.coords = [x,y]
  }

  set coords(args) {
    this.x = args[0]
    this.y = args[1]
  }

  get coords() {
    return [this.x, this.y]
  }

  render() {
    this.path = new Path2D()
    this.path.rect(this.x, this.y, 10, 10)
    return this.path
  }
}

class Bezier {
  constructor() {
    this.controlPoints = 
      [new Point(this), new Point(this), new Point(this)]
    this.path = new Path2D();
  }

  render() {
    this.path = new Path2D()
    this.path.moveTo(this.controlPoints[0].x, this.controlPoints[0].y)
    this.path.quadraticCurveTo(
      this.controlPoints[1].x, this.controlPoints[1].y,
      this.controlPoints[2].x, this.controlPoints[2].y
    )

    return this.path
  }
}

class QuadSpline {
  constructor(p1,p2,p3,pos) {
    this.controlPoints = [p1,p2,p3]
    this.splineRenderer = quadSplineFromThreeControlPoints(
      [this.controlPoints[0].x, this.controlPoints[0].y],
      [this.controlPoints[1].x, this.controlPoints[1].y],
      [this.controlPoints[2].x, this.controlPoints[2].y],
      pos
    )
    this.path = new Path2D();
  }

  render() {
    this.path = new Path2D();
    this.path.moveTo(...this.splineRenderer(0))
    for(let t=0.1; t<1; t+=0.1) {
      this.path.lineTo(...this.splineRenderer(t))
    }
    return this.path
  }

  renderPoints() {
    const pointsArray = []
    for(let t=0.1; t<1; t+=0.1) {
      pointsArray.push(this.splineRenderer(t))
    }
    return pointsArray
  }
}

class DoublyLinkedList {
  constructor(vals) {
    this.data = {
      value: vals.shift(),
      next: undefined,
      prev: undefined
    }
    this.fromArray(vals)
  }

  fromArray(arr) {
    while(arr.length) {
      this.next = arr.shift()
      this.forward()
    }
  }

  toArray() {
    const linkedListToArr = []
    this.goToFirst()

    while(this.next !== undefined) {
      linkedListToArr.push(this.value)
      this.forward()
    }
    linkedListToArr.push(this.value)
    return linkedListToArr
  }

  goToFirst() {
    while(this.prev !== undefined) {
      this.backward()
    }
    return this
  }

  map(func) {
    const mapArr = []
    this.goToFirst()
    while(this.next) {
      mapArr.push(func(this))
      this.forward()
    }
    return mapArr
  }

  forward() {
    this.data = this.next ?? this.data
  }

  backward() {
    this.data = this.prev ?? this.data
  }

  addAfterIndex(index, val) {
    this.goToFirst()
    debugger
    while(index-- && this.next) {
      this.forward()
    }
    this.next = val
  }

  get next() {
    return this.data?.next ?? undefined
  }

  get value() {
    return this.data.value
  }

  get prev() {
    return this.data?.prev ?? undefined
  }

  set next(val) {
    this.data.next = {
      prev: this.data,
      value: val,
      next: this.data?.next
    }
  }

  set prev(val) {
    this.data.prev = {
      next: this.data,
      value: val,
      prev: this.data?.prev
    }
  }
}


const triAreaFromVec = (v1, v2) => (v1.x*v2.y - v2.x*v1.y)**2
class BSpline {
  constructor(...controlPoints) {
    this.path = new Path2D()
    this.controlPoints = new DoublyLinkedList(controlPoints)

    this.splines = []
    this.recreateSplines()
  }

  render() {
    this.recreateSplines()
    const path = new Path2D()
    path.moveTo(...this.controlPoints.goToFirst().value.coords)
    this.splines.forEach((curSpline) => {
      curSpline.renderPoints().forEach(
        (coords) => path.lineTo(...coords)
      )
    }
    )
    path.closePath()
    return path
  }

  getControlPointIndex(newControlPoint) {
    const controlPointArray = this.controlPoints.toArray()

    const pairsOfControlPoints = controlPointArray.map(
      (_,ind, arr) => [arr[ind], arr[ind+1]])
    
    const pairsWithTriangleAreas = pairsOfControlPoints.slice(0,-2).map(
      (pairOfPoints, index) => [index, triAreaFromVec(
        new Point(
          pairOfPoints[0].x - newControlPoint.x,
          pairOfPoints[0].y - newControlPoint.y
        ),
        new Point(
          pairOfPoints[1].x - newControlPoint.x,
          pairOfPoints[1].y - newControlPoint.y
        )
      )]
    )

    pairsWithTriangleAreas.sort(
     (a,b) => b[1] < a[1]
    )
    const minIndex = pairsWithTriangleAreas[0][0]

    return minIndex
  }

  addControlPoint(newControlPoint) {
    const index = this.getControlPointIndex(newControlPoint)
    this.controlPoints.addAfterIndex(index, newControlPoint)
    //this.recreateSplines()
  }

  recreateSplines() {
    this.splines = this.controlPoints.map((val) => {
      const curSplineControls =
        [val.value, val.next.value, val.next.next?.value]
      return curSplineControls.every((val) => Boolean(val)) ?
        new QuadSpline(
          ...curSplineControls, 
           val.prev == undefined ? 'first' : val.next.next.next == undefined ? 'last' : 'mid') : null
        })
    
    this.splines = this.splines.filter((val) => Boolean(val))
    }
}

class Screen {
  constructor(canvas) {
    this.path = new Path2D();
    this.thingsToRender = [];
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')
  }

  attachRenderableObjects(...objects) {
    this.thingsToRender.push(...objects)
  }

  renderAndDraw() {
    this.path = new Path2D()
    this.thingsToRender.forEach(
      (renderableObject) => { this.path.addPath(renderableObject.render()) }
    )
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height)
    this.ctx.stroke(this.path)
    return this.path
  }
}


bezierLeft = new BSpline(
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

bezierRight = new BSpline(
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
  x = e.offsetX;
  y = e.offsetY;
  point = new Point(x,y)
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
  R = Rgen(featherPath)
  R(0)
  console.log("OK!")
}
