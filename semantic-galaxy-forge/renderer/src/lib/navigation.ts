import * as THREE from 'three'

export type NavigationMode = 'orbit' | 'fly'

export class SpaceshipControls {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  mode: NavigationMode = 'orbit'

  private velocity = new THREE.Vector3()
  private euler = new THREE.Euler(0, 0, 0, 'YXZ')
  private keys = new Set<string>()
  private pointerLocked = false
  private speed = 20

  private orbitTarget = new THREE.Vector3()
  private orbitDistance = 40
  private orbitTheta = 0
  private orbitPhi = Math.PI / 3
  private orbitDragging = false
  private orbitLastMouse = new THREE.Vector2()

  onModeChange?: (mode: NavigationMode) => void

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.updateOrbitPosition()
    this.bindEvents()
  }

  private bindEvents() {
    const el = this.domElement

    el.addEventListener('keydown', this.onKeyDown)
    el.addEventListener('keyup', this.onKeyUp)
    el.addEventListener('mousedown', this.onMouseDown)
    el.addEventListener('mousemove', this.onMouseMove)
    el.addEventListener('mouseup', this.onMouseUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    document.addEventListener('mousemove', this.onPointerLockMove)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code)

    if (e.code === 'KeyV') {
      this.setMode(this.mode === 'orbit' ? 'fly' : 'orbit')
    }
    if (e.code === 'Escape' && this.pointerLocked) {
      document.exitPointerLock()
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  private onMouseDown = (e: MouseEvent) => {
    if (this.mode === 'fly' && e.button === 0) {
      if (!this.pointerLocked) {
        this.domElement.requestPointerLock()
      }
    } else if (this.mode === 'orbit' && e.button === 0) {
      this.orbitDragging = true
      this.orbitLastMouse.set(e.clientX, e.clientY)
    }
  }

  private onMouseUp = () => {
    this.orbitDragging = false
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'orbit' || !this.orbitDragging) return
    const dx = e.clientX - this.orbitLastMouse.x
    const dy = e.clientY - this.orbitLastMouse.y
    this.orbitLastMouse.set(e.clientX, e.clientY)
    this.orbitTheta -= dx * 0.005
    this.orbitPhi = Math.max(0.05, Math.min(Math.PI - 0.05, this.orbitPhi + dy * 0.005))
    this.updateOrbitPosition()
  }

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.domElement
    if (!this.pointerLocked) {
      this.velocity.set(0, 0, 0)
    }
  }

  private onPointerLockMove = (e: MouseEvent) => {
    if (!this.pointerLocked || this.mode !== 'fly') return
    this.euler.y -= e.movementX * 0.002
    this.euler.x -= e.movementY * 0.002
    this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x))
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (this.mode === 'orbit') {
      this.orbitDistance = Math.max(5, Math.min(200, this.orbitDistance + e.deltaY * 0.05))
      this.updateOrbitPosition()
    } else {
      this.speed = Math.max(1, Math.min(200, this.speed - e.deltaY * 0.05))
    }
  }

  private updateOrbitPosition() {
    const x = this.orbitDistance * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta)
    const y = this.orbitDistance * Math.cos(this.orbitPhi)
    const z = this.orbitDistance * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta)
    this.camera.position.set(
      this.orbitTarget.x + x,
      this.orbitTarget.y + y,
      this.orbitTarget.z + z
    )
    this.camera.lookAt(this.orbitTarget)
  }

  setMode(mode: NavigationMode) {
    if (mode === this.mode) return
    this.mode = mode
    if (mode === 'orbit') {
      if (this.pointerLocked) document.exitPointerLock()
      this.velocity.set(0, 0, 0)
      this.updateOrbitPosition()
    } else {
      this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ')
    }
    this.onModeChange?.(mode)
  }

  setOrbitTarget(target: THREE.Vector3) {
    this.orbitTarget.copy(target)
    this.updateOrbitPosition()
  }

  update(dt: number) {
    if (this.mode !== 'fly') return

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.euler)
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.euler)
    const up = new THREE.Vector3(0, 1, 0)

    const accel = 80 * dt
    const friction = Math.pow(0.01, dt)

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.velocity.addScaledVector(forward, accel)
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.velocity.addScaledVector(forward, -accel)
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.velocity.addScaledVector(right, -accel)
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.velocity.addScaledVector(right, accel)
    if (this.keys.has('Space')) this.velocity.addScaledVector(up, accel)
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) this.velocity.addScaledVector(up, -accel)

    const maxSpeed = this.speed
    const curSpeed = this.velocity.length()
    if (curSpeed > maxSpeed) this.velocity.multiplyScalar(maxSpeed / curSpeed)

    this.velocity.multiplyScalar(friction)
    this.camera.position.addScaledVector(this.velocity, dt)

    const targetQuat = new THREE.Quaternion().setFromEuler(this.euler)
    this.camera.quaternion.slerp(targetQuat, 0.3)
  }

  dispose() {
    const el = this.domElement
    el.removeEventListener('keydown', this.onKeyDown)
    el.removeEventListener('keyup', this.onKeyUp)
    el.removeEventListener('mousedown', this.onMouseDown)
    el.removeEventListener('mousemove', this.onMouseMove)
    el.removeEventListener('mouseup', this.onMouseUp)
    el.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    document.removeEventListener('mousemove', this.onPointerLockMove)
    if (this.pointerLocked) document.exitPointerLock()
  }
}
