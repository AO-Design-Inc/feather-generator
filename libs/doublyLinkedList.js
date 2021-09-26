export default class DoublyLinkedList {
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