const MapMatrix = (matrix, fn) => {
    return matrix.map(arr => arr.map(fn));
}

const EffectDefine = (slotHandler) => {
    let { slotModule, saveData } = slotHandler;


    class EffectManager {
        constructor() {}
        async onLot(lot, control, gameMode, bonusFlag) {

        }
        async payEffect(payCoin, betCoin, hitYakus) {

        }
        async onPay(payCoin, betCoin, hitYakus, gameMode) {
            await this.payEffect(payCoin, betCoin, hitYakus, gameMode);
        }
    }

    class NormalEffect extends EffectManager {
        constructor() {
            super();
            this.isAT = false;
            this.replayCounter = [
                Rand(150),
                Rand(100),
                Rand(20),
                Rand(5),
                Rand(3)
            ];
            this.replayRen = 0;
            this.nabiPowerTable = [32, 16, 4]
            this.nabiLevel = Rand(3);
        }
        NabiModeLot(lot) {
            switch (lot) {
                case 'チャンス目A':
                case 'チャンス目B':
                    if (!Rand(2)) {
                        this.nabiLevel++;
                    }
                    break
                case 'スイカ':
                    if (Rand(3)) {
                        this.nabiLevel++;
                    }
                    break
                default:
                    if (!Rand(32)) this.nabiLevel--;

            }
            if (this.nabiLevel < 0) this.nabiLevel = 0;
            if (this.nabiLevel >= this.nabiPowerTable.length) this.nabiLevel = this.nabiPowerTable.length - 1;
            // console.log(this.nabiLevel)
        }
        async NabiLot(control) {
            let n = NabiTable[control];
            if (control === 'Bonus') n = NabiTable[Rand(NabiTable.length)];
            let { slotModule, Segments } = slotHandler
            const { effectseg, dekaseg } = Segments;
            // console.log(control)

            if (!Rand(this.nabiPowerTable[this.nabiLevel]) || control === 'Bonus') {
                if (n) {
                    await sounder.playSound('nabi')
                    Nabi(n);
                }
            }
        }
        async onLot(lot, control, gameMode, bonusFlag) {

            switch (gameMode) {
                case 'normal':
                    if (bonusFlag === null) {
                        this.NabiModeLot(lot);
                        await this.NabiLot(control);
                    } else {
                        if (!Rand(4)) await this.NabiLot('Bonus')
                    }
                    break
                case 'Diamond':
                    switch (control) {
                        case 'ボーナス小役1':
                            sounder.playSound('pyui');
                            break
                        case 'ボーナス小役2':
                            if (Rand(8)) {
                                sounder.stopSound('bgm');
                                window.leverEffect = '無音'
                            } else {
                                sounder.playSound('pyui');
                            }
                            break
                    }
            }
        }
        async payEffect(payCoin, betCoin, hitYakus, gameMode) {
            if (hitYakus.length === 0) return;
            const { Segments } = slotHandler;
            const { dekaseg } = Segments;
            let first = hitYakus[0];
            let { name } = first
            switch (gameMode) {
                case 'normal':
                    switch (name) {
                        case 'リプレイ':
                            await this.replayEffect()
                            break
                        case 'ダイヤモンド':
                            sounder.stopSound('bgm');
                            await sounder.playSound('CD7Start');
                            sounder.playSound('CD7', 7);
                            dekaseg.setSegments('-7-')
                            break
                        case '転落リプレイ':
                            this.replayRen = 0;
                            break
                        default:
                    }
                    break
                case 'Diamond':
                    switch (name) {
                        case 'ボーナス小役1':
                            let c = Math.floor((bonusData.maxPay - bonusData.payd) / 2) - 1;
                            if (c == 0) {
                                dekaseg.reset();
                                sounder.stopSound('bgm');
                                await sounder.playSound('bubu');
                                break
                            }
                            dekaseg.setSegments('-' + c + '-');
                            break
                        case 'ボーナス小役2':
                            sounder.stopSound('bgm');
                            await sounder.playSound('fanfare1');
                            slotHandler.effectManeger = new ATEffect();
                    }
            }
        }
        async replayEffect() {
            const { Segments } = slotHandler;
            const { dekaseg } = Segments;
            let isAtHit = false;
            let isReachMe = false;

            this.replayRen++;
            for (let i = 0; i < this.replayRen; i++) {
                if (this.replayCounter[i]) {
                    this.replayCounter[i]--;
                    if (this.replayCounter[i] === 1) {
                        isReachMe = !Rand(2);
                    }
                } else {
                    isAtHit = true;
                }
            }

            let [v, isReach] = SegmentValueGenerator({ isAtHit, isReachMe });


            let reachLevels = {
                false: [90, 10, 0],
                true: [50, 30, 20]
            }[isAtHit];

            let shuffleTable = [true, true, true];
            let waitTable = [150, 150];
            if (isReach) {
                let reachType = ArrayLot(reachLevels);
                waitTable.push([600, 2000, 5500][reachType])
                sounder.playSound('seg' + (2 + reachType));
            } else {
                waitTable.push(150)
                sounder.playSound('seg1')
            }

            const fn = async(idx) => {
                if (!shuffleTable[idx]) {
                    dekaseg.setSegment(idx, v[idx]);
                    return
                }
                dekaseg.setSegment(idx, "0123456789" [Rand(10)]);
                await Sleep(10);
                fn(idx)
            }

            shuffleTable.forEach((d, idx) => fn(idx));
            for (let i = 0; i < 3; i++) {
                await Sleep(waitTable[i]);
                shuffleTable[i] = false
            }
            if (isAtHit) {
                await sounder.playSound('paka-n');
                slotHandler.effectManeger = new ATEffect();
            }
        }
    }

    class ATEffect extends EffectManager {
        constructor() {
            super();
            this.isAT = false;
            const { slotModule, Segments, saveData } = slotHandler;
            this.DefaultATGame = 77;
            this.bunbo = this.DefaultATGame;

            let loopLot = [0, 97, 98, 99][ArrayLot([80, 18, 1, 1])]
            let hua = true;
            for (let i = this.DefaultATGame; i < 111; i++) {
                if (Math.random() * 100 >= loopLot) {
                    hua = false;
                    break
                }
            }
            if (hua) {
                this.bunbo = 111;
                while (true) {
                    if (Math.random() * 100 >= loopLot) {
                        break
                    }
                    this.bunbo++;
                }
            }
            this.first = true;
        }
        async onLot(lot, control, gameMode, bonusFlag) {
            if (this.first) {
                await this.atStartEffect();
                this.first = false;
            }
            switch (gameMode) {
                case 'normal':
                    let n = NabiTable[control];
                    let { slotModule, Segments } = slotHandler
                    const { effectseg, dekaseg } = Segments
                    effectseg.setSegments(this.bunbo);

                    if (bonusFlag) {
                        if (Rand(2)) {
                            let keys = Object.keys(NabiTable);
                            n = NabiTable[keys[Rand(keys.length)]];
                            Nabi(n);
                            if (!n.includes('-')) sounder.playSound('nabi');
                            (async() => {
                                await slotModule.once('payEnd');
                                sounder.stopSound(this.BGM);
                            })();
                            break
                        }
                    }
                    if (n) {
                        Nabi(n);
                        if (!n.includes('-')) sounder.playSound('nabi')
                    } else {
                        if (!n) {
                            sounder.playSound('atStart2');
                            if (Rand(3)) {
                                this.bunbo += [5, 10, 30, 50, 100, 200, 300][ArrayLot([650, 100, 80, 50, 10, 5, 5])];

                                (async() => {
                                    await slotModule.once('payEnd');
                                    sounder.playSound('bell');
                                    effectseg.setSegments(this.bunbo);
                                })();

                            }
                            break
                        }
                    }

                    const TenrakuKakuritu = 1 / 2
                    let tenrakuEffect = Rand(this.bunbo) < (1 / TenrakuKakuritu);
                    if (!tenrakuEffect) break
                    let isTenraku = tenrakuEffect && Math.random() < TenrakuKakuritu;
                    await sounder.playSound('down');
                    if (!isTenraku) break;
                    (async() => {
                        await slotModule.once('payEnd');
                        let getCoin = '' + slotHandler.saveData.bonusEnd();
                        console.log(getCoin)
                        effectseg.setSegments(getCoin.slice(-3));
                        dekaseg.setSegments(getCoin.slice(0, -3));
                        sounder.stopSound('bgm');
                        await sounder.playSound('bubu')
                        slotHandler.effectManeger = new NormalEffect;
                        await slotHandler.slotModule.once('leverOn');
                        effectseg.reset();
                        dekaseg.reset();
                    })();

                    break
                case 'Diamond':
                    switch (control) {
                        case 'ボーナス小役1':
                            sounder.playSound('pyui');
                            break
                        case 'ボーナス小役2':
                            if (Rand(8)) {
                                sounder.stopSound('bgm');
                                window.leverEffect = '無音'
                            } else {
                                sounder.playSound('pyui');
                            }
                            break
                    }
            }

        }
        async payEffect(payCoin, betCoin, hitYakus, gameMode) {
            if (hitYakus.length === 0) return;
            let { name } = hitYakus[0];
            let { slotModule, Segments } = slotHandler
            const { effectseg, dekaseg } = Segments
            switch (gameMode) {
                case 'normal':
                    switch (name) {
                        case 'ダイヤモンド':
                            sounder.stopSound('bgm');
                            await sounder.playSound('CD7Start');
                            sounder.playSound('CD7', 7);
                            dekaseg.setSegments('-7-')
                    }
                    break
                case 'Diamond':
                    switch (name) {
                        case 'ボーナス小役1':
                            let c = Math.floor((bonusData.maxPay - bonusData.payd) / 2) - 1;
                            if (c == 0) {
                                dekaseg.reset();
                                sounder.stopSound('bgm');
                                await sounder.playSound('bubu');
                                (async() => {
                                    await slotModule.once('bet');
                                    slotModule.freeze();
                                    await sounder.playSound('atStart2');
                                    effectseg.setSegments(this.bunbo);
                                    slotModule.resume();
                                    sounder.playSound(this.BGM, true);
                                })();
                                break
                            }
                            dekaseg.setSegments('-' + c + '-');
                            break
                        case 'ボーナス小役2':
                            sounder.stopSound('bgm');
                            await sounder.playSound('fanfare1');
                            dekaseg.setSegments('Add');

                            let loopLot = [90, 95, 98][ArrayLot([45, 45, 10])];
                            await sounder.playSound('countUp2Start')
                            let v = this.bunbo;
                            while (true) {
                                v++;
                                effectseg.setSegments(v);
                                await sounder.playSound('countUp2Part');
                                if (Math.random() * 100 >= loopLot) break
                            }
                            await sounder.playSound('countUp2End');
                            await sounder.playSound('atHit');
                            this.bunbo = v;
                            (async() => {
                                await slotModule.once('bet');
                                slotModule.freeze();
                                await sounder.playSound('atStart2');
                                effectseg.setSegments(this.bunbo);
                                slotModule.resume();
                                sounder.playSound(this.BGM, true);
                            })();
                            break
                    }
            }
        }
        async atStartEffect() {
            const { slotModule, Segments, saveData } = slotHandler;
            let hua = this.bunbo > this.DefaultATGame;
            saveData.bonusStart('AT')
            sounder.playSound('countUp1');
            let viewCount = 0;
            for (; viewCount <= this.DefaultATGame; viewCount++) {
                Segments.effectseg.setSegments(viewCount);
                await Sleep(20);
            }
            await Sleep(4000);
            viewCount = this.DefaultATGame;
            let part = 0
            let fc = 0;
            while (viewCount < this.bunbo) {
                let targetCount = this.bunbo;
                if ((fc + 1) * 111 < this.bunbo) {
                    fc++;
                    targetCount = Rand(111, viewCount + part);
                    part = fc * 111 - targetCount;
                    console.log({ viewCount, targetCount, part })
                }
                await sounder.playSound('hua');
                await Sleep(300);
                await sounder.playSound('countUp2Start');
                sounder.playSound('countUp2Part', true);
                for (; viewCount <= targetCount; viewCount++) {
                    Segments.effectseg.setSegments(viewCount);
                    await Sleep(50);
                }
                sounder.stopSound('countUp2Part');
                await sounder.stopSound('countUp2End');
                await Sleep(4000);
            }

            await sounder.playSound('atHit');
            slotModule.resume();
            if (hua) {
                this.BGM = 'AT2'
            } else {
                this.BGM = 'AT1'
            }
            (async() => {
                await sounder.playSound('atStart');
                sounder.playSound(this.BGM, true)
            })();
        }
    }

    slotHandler.effectManeger = new NormalEffect()
}

const NabiTable = {
    "ベル1": '123',
    "ベル2": '132',
    "ベル3": '213',
    "ベル4": '312',
    "ベル5": '231',
    "ベル6": '321',
    "リプレイ1": '1--',
    "リプレイ2": '-1-',
    "リプレイ3": '--1',
}


const Nabi = async(n) => {
    let nabi = [...n];
    const B = ' ';
    const Blinker = [0, 0, 0];
    const { Segments, slotModule } = slotHandler;
    const { dekaseg } = Segments;

    const fn = async(i) => {
        if (Blinker[i] == -1) {
            dekaseg.setSegment(i, ' ');
            return;
        }
        dekaseg.setSegment(i, nabi[i]);
        if (Blinker[i] > 0) {
            await Sleep(Blinker[i]);
            dekaseg.setSegment(i, ' ');
            await Sleep(Blinker[i]);
        } else {
            await Sleep(50);
        }
        fn(i);
    }

    nabi.forEach((n, idx) => {
        fn(idx);
    })
    let nc = 2;
    slotModule.zyunjo = nabi.map(d => {
        return d === '-' ? nc++ : Number(d);
    }).reduce((a, d, i) => {
        a[d - 1] = i + 1;
        return a;
    }, []);

    for (let i = 1; i <= 3; i++) {
        nabi = nabi.map((n, idx) => {
            if (n < i) {
                Blinker[idx] = -1;
                return B
            }
            if (n == i) {
                Blinker[idx] = 100;
                return n
            }
            if (n == i + 1) {
                Blinker[idx] = 0;
                return n
            }
            if (i > 1) return B;
            Blinker[idx] = 0
            return n;
        })
        await slotModule.once('reelStop');
        if (!n.includes('-')) sounder.playSound('nabiStop')
    }
    Blinker[0] = Blinker[1] = Blinker[2] = -1;
}

const SegmentValueGenerator = ({ isAtHit, isReachMe }) => {
    isAtHit = !!isAtHit;
    isReachMe = !!isReachMe

    let v = [];
    if (isAtHit) {
        v = Array(3).fill('' + Rand(10));
        if (!Rand(4)) {
            v[Rand(2)] = 'F';
        }
        if (!Rand(8)) {
            v[0] = v[1] = 'F';
        }
        return [v, true];
    }
    let r = false;
    const Reach = [
        "012",
        "123",
        "234",
        "345",
        "456",
        "567",
        "678",
        "789",
        "010",
        "101",
        "232",
        "323",
        "454",
        "545",
        "676",
        "767",
        "898",
        "989"
    ]

    v.push('' + Rand(10));
    v.push('' + Rand(10));
    if (v[0] == v[1]) {
        r = true;
    }

    const checkFnList = [
        str => {
            return Reach.includes(str);
        },
        str => {
            let vs = [...str].map(Number);
            let sum = vs.reduce((a, b) => a + b);
            return sum === 9 || sum === 19;
        }
    ]

    let allowList = [...Array(10).keys()].map(d => d.toString()).filter(d => {
        let str = v[0] + v[1] + d;
        if (r && v[0] === d) {
            return false;
        }
        // console.log({ str }, checkFnList[0](str), checkFnList[1](str), isReachMe, checkFnList.some(fn => fn(str)))
        return checkFnList.some(fn => fn(str)) == isReachMe;
    })

    if (allowList.length === 0) return SegmentValueGenerator({ isAtHit, isReachMe });
    v.push(allowList[Rand(allowList.length)]);
    if (r && !Rand(12)) {
        v[Rand(2)] = 'F';
    }
    return [v, r];

}