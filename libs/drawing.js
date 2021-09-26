import {mat2, mat3, mat4, vec2, vec3, vec4} from '../gl-matrix-3.3.0/src/index.js'
import DoublyLinkedList from './doublyLinkedList.js'

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

export class Point {
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

export class Bezier {
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

export class QuadSpline {
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

const triAreaFromVec = (v1, v2) => (v1.x*v2.y - v2.x*v1.y)**2
export class BSpline {
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

export class Screen {
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

export class Pen {
  constructor(x,y,angle,ctx) {
    this.ctx = ctx
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
    this.ctx.stroke(this.path)
  }

  boundsCheck(boundPath) {
    return this.ctx.isPointInPath(boundPath, this.x, this.y)
  }
}
