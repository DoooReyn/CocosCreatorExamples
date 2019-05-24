cc.Class({
    extends: cc.Component,

    properties: {
        speed: cc.v2(0, 0),
        maxSpeed: cc.v2(2000, 2000),
        gravity: -1000,
        drag: 1000,
        direction: 0,
        jumpSpeed: 300
    },

    // use this for initialization
    onLoad: function () {
        //add keyboard input listener to call turnLeft and turnRight
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyPressed, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyReleased, this);

        this.contacts = [];
        this.collisionX = 0;
        this.collisionY = 0;
        this.selfBoxCollider = this.getComponent(cc.BoxCollider);

        this.prePosition = cc.v2();
        this.preStep = cc.v2();

        this.touchingNumber = 0;
    },

    onEnable: function () {
        cc.director.getCollisionManager().enabled = true;
        cc.director.getCollisionManager().enabledDebugDraw = true;
    },

    onDisable: function () {
        cc.director.getCollisionManager().enabled = false;
        cc.director.getCollisionManager().enabledDebugDraw = false;
    },
    
    onKeyPressed: function (event) {
        let keyCode = event.keyCode;
        switch(keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.direction = -1;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.direction = 1;
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
                if (!this.jumping) {
                    this.jumping = true;
                    this.speed.y = this.jumpSpeed;    
                }
                break;
        }
    },
    
    onKeyReleased: function (event) {
        let keyCode = event.keyCode;
        switch(keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.direction = 0;
                break;
        }
    },
    
    onCollisionEnter: function (other, self) {
        this.node.color = cc.Color.RED;
        this.contacts.push(other);
        this.touchingNumber ++;
        console.log('碰撞'); 
        
        this.checkCollision();
    },
    
    onCollisionStay: function (otherCollider, self) {
        if (this.collisionY === -1) {
            if (otherCollider.node.group === 'Platform') {
                var motion = otherCollider.node.getComponent('PlatformMotion');
                if (motion) {
                    this.node.x += motion._movedDiff;
                }
            }
        }
    },
    
    onCollisionExit: function (other) {
        this.touchingNumber --;
        if (this.touchingNumber === 0) {
            this.node.color = cc.Color.WHITE;
        }

        let index = this.hasContact(other);
        if(index >= 0) {
            this.contacts.splice(index, 1);
            console.log('分离');
        }

        this.checkCollision();
    },

    checkCollision() {
        let x = 0, y = 0;
        let self = this.selfBoxCollider;
        let selfAabb = self.world.aabb;
        let selfPreAabb = selfAabb;//self.world.preAabb.clone();
        // selfPreAabb.x = selfAabb.x;
        // selfPreAabb.y = selfAabb.y;

        for(let i = 0; i < this.contacts.length; i++) {
            let other = this.contacts[i];
            let otherAabb = other.world.aabb;
            let otherPreAabb = other.world.preAabb.clone();//otherAabb; //other.world.preAabb.clone();
            otherPreAabb.x = otherAabb.x;
            otherPreAabb.y = otherAabb.y;
            if (cc.Intersection.rectRect(selfPreAabb, otherPreAabb)) {
                // console.log('交叉重叠');
                if(x == 0) {
                    let isColliderWithX = true;
                    if(this.speed.y == 0) {
                        if(Math.ceil(selfPreAabb.yMin) >= otherPreAabb.yMin + otherPreAabb.height) {
                            isColliderWithX = false;
                        }
                    }
                    if(isColliderWithX) {
                        if (this.speed.x < 0 && (selfPreAabb.xMax > otherPreAabb.xMax)) {
                            x = -1;
                            this.node.x = otherPreAabb.xMax - this.node.parent.x;
                            console.log('左', selfPreAabb, otherPreAabb);
                            break;
                        }
                        else if (this.speed.x > 0 && (selfPreAabb.xMin < otherPreAabb.xMin)) {
                            x = 1;
                            this.node.x = otherPreAabb.xMin - this.node.parent.x - selfPreAabb.width;
                            console.log('右', selfPreAabb, otherPreAabb);
                            break;
                        }
                    }
                }

                if(y == 0) {
                    // console.log('Y:', selfPreAabb, otherPreAabb);
                    if (this.speed.y <= 0 && (selfPreAabb.yMax > otherPreAabb.yMax)) {
                        y = -1;
                        this.node.y = otherPreAabb.yMax - this.node.parent.y;
                        console.log('上');
                    }
                    else if (this.speed.y >= 0 && (selfPreAabb.yMin < otherPreAabb.yMin)) {
                        y = 1;
                        this.node.y = otherPreAabb.yMin - selfPreAabb.height - this.node.parent.y;
                        console.log('下');
                    }
                }
            }
        }
        
        console.log(`个数：${this.contacts.length}, 速度：${this.speed}, X轴：${x}, Y轴：${y}`);

        this.collisionX = x;
        this.collisionY = y;
        if(x != 0) {
            this.speed.x = 0;
        }
        if(y == -1) {
            this.jumping = false;
            this.speed.y = 0;
        } else if(y == 1) {
            this.speed.y = 0;
        }
    },

    hasContact(contact) {
        for(let i=0; i<this.contacts.length; i++) {
            if(this.contacts[i].node.uuid == contact.node.uuid) {
                return i;
            }
        }
        return -1;
    },

    isContactOnY() {
        for(let i=0; i<this.contacts.length; i++) {
            if(this.contacts[i].touchingY) {
                return true;
            }
        }
        return false;
    },
    
    update: function (dt) {
        if (this.collisionY === 0) {
            this.speed.y += this.gravity * dt;
            if (Math.abs(this.speed.y) > this.maxSpeed.y) {
                this.speed.y = this.speed.y > 0 ? this.maxSpeed.y : -this.maxSpeed.y;
            }
        }

        if (this.direction === 0) {
            if (this.speed.x > 0) {
                this.speed.x -= this.drag * dt;
                if (this.speed.x <= 0) this.speed.x = 0;
            }
            else if (this.speed.x < 0) {
                this.speed.x += this.drag * dt;
                if (this.speed.x >= 0) this.speed.x = 0;
            }
        }
        else {
            this.speed.x += (this.direction > 0 ? 1 : -1) * this.drag * dt;
            if (Math.abs(this.speed.x) > this.maxSpeed.x) {
                this.speed.x = this.speed.x > 0 ? this.maxSpeed.x : -this.maxSpeed.x;
            }
        }

        if (this.speed.x * this.collisionX > 0) {
            this.speed.x = 0;
        }
        
        this.node.x += this.speed.x * dt;
        this.node.y += this.speed.y * dt;
    },
});
