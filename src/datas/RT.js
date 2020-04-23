class RT {
    constructor() {
        this.rt = null;
    }
    countGame() {
        if (this.rt === null) return;
        this.rt--;
        if (this.rt === 0) return new DefaultRTClass;
    }
    hitCheck(hit) {
        return null;
    }
    onHit(hit) {
        return this.hitCheck(hit) || this.countGame() || this;
    }
    onLot() {
        return null;
    }
}

class DefaultRT extends RT {
    constructor() {
        super();
        console.log(this.constructor.name + 'へ以降');
        this.rt = null;
    }
    hitCheck(hit) {
        switch (hit) {
            case 'リプレイ':
                return new HighRT
        }
    }
    onLot(lot) {}
}

class HighRT extends RT {
    constructor(game) {
        super();
        console.log(this.constructor.name + 'へ以降');
        this.rt = game;
        this.lastHit = null
    }
    hitCheck(hit) {
        if (hit === '転落リプレイ') {
            return new DefaultRT;
        }
    }
    onLot(lot) {
        this.lastHit = lot;
        if (lot === null) {
            return 'リプレイ' + Rand(3, 1);
        }
    }
}


const DefaultRTClass = DefaultRT;