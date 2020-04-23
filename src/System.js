/*************************************
 * いわゆるメイン基板処理
 * 成立役=>制御の変換や、
 * 払い出し時のゲームモード移行などのアクションを定義する。
 */

const SystemDefine = (slotHandler) => {
    const { slotModule } = slotHandler;
    const { flashController, slotStatus } = slotModule;

    slotModule.RTdata = new DefaultRTClass;

    /***********************
     * 3リール停止後、SlotModuleから送られてくる成立役を元に、
     * 払い出し枚数、フラッシュ、アクションなどを決定する。
     */
    slotModule.onHitCheck = async(e) => {
        let replayFlag = false;
        let payCoin = 0;
        let flashMatrix = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        let hitYakus = [];
        let dummyReplayFlag = false
        for (let data of e) {
            console.log(data)
            let { line, index, matrix } = data;
            let yaku = YakuData[index];
            hitYakus.push(yaku);
            let { name, pay } = yaku;
            let p = pay[3 - slotStatus.betCoin];
            if (Array.isArray(p)) {
                p = p[slotModule.reelController.mode];
            }
            payCoin += p;

            if (!yaku.noEffectable) lastHit = { pay, name, yaku };

            let m = yaku.flashLine || matrix;

            // 成立役フラッシュの合成
            flashMatrix = flashMatrix.map((arr, y) => arr.map((d, x) => d || m[y][x]));

            switch (gameMode) {
                case 'normal':
                    switch (name) {
                        case 'リプレイ':
                            replayFlag = true
                            break
                        case '転落リプレイ':
                            replayFlag = true
                            dummyReplayFlag = true;
                            break
                        case 'ダイヤモンド':
                            bonusData = new BonusData.BigBonus5('Diamond', 14);
                            // bonusFlag = null;
                    }
                    break
            }

            slotModule.RTdata = slotModule.RTdata.hitCheck(name) || slotModule.RTdata;
        }
        switch (name) {
            default:
            // 成立役フラッシュ
                (async() => {
                while (slotStatus.status !== 'beted') {
                    await flashController.setFlash(FlashData.default, 20);
                    await flashController.setFlash(ReplaceMatrix(FlashData.default, flashMatrix, ColorData.LINE_F, null), 20)
                }
            })();
        }
        console.log(payCoin)
        return { payCoin, replayFlag, hitYakus, dummyReplayFlag };

    }

    slotModule.on("bonusEnd", async() => {
        /**************************
         * ボーナス終了後の処理
         * 【注意】
         * このイベントは、手動で発火が必要です。
         * slotModule.emit('bonusEnd')
         * と呼び出してください。
         */

        slotHandler.saveData.bonusEnd();
        setGamemode("normal");
        slotModule.freeze();
        await Sleep(2000);
        slotModule.resume();
        bonusData = null;
        bonusFlag = null;
        slotModule.RTdata = new HighRT;
    });


    slotModule.onPayEnd = async({ payCoin, replayFlag, hitYakus }) => {
        /**************************
         * ボーナス終了後の処理
         * 払い出し後の演出や、ボーナス終了の処理を記述する。
         * 
         */
        const { effectManeger } = slotHandler;
        await effectManeger.onPay(payCoin, slotStatus.betCoin, hitYakus, gameMode);
        if (bonusData) {
            bonusData.onPay(payCoin)
            setGamemode(bonusData.getGameMode());
            if (bonusData.isEnd) {
                await slotModule.emit('bonusEnd');
            };
        }
    }
    slotModule.onBet = async() => {
        // ベットボタンを押したときの処理
        // フラッシュをリセットする
        flashController.clearFlashReservation();
    }
    slotModule.onBetCoin = async(betCoin, isDummy) => {
        // ベットを行うときの処理
        // ベット枚数分音を鳴らしている


        sounder.playSound("bet")
        while (betCoin--) {
            if (!isDummy) {
                slotHandler.saveData.coin--;
                slotHandler.saveData.inCoin++;
                changeCredit(-1);
            }
            await Sleep(70);
        }
        Segments.payseg.reset();
    }
    slotModule.onPay = async({ payCoin, replayFlag, noSE, dummyReplayFlag }) => {
        // 払い出しの処理
        // 払い出しがあるかないか、そしてリプレイかどうかで処理を分けている
        let pays = payCoin;
        let loopPaySound = null;
        let payCount = 0;
        let seLoopFlag = false;

        if (dummyReplayFlag) {
            (async() => {
                slotModule.freeze();
                await Promise.race([
                    slotModule.once('pressBet'),
                    slotModule.once('pressAllmity')
                ])
                await slotModule.onBetCoin(3, true);
                slotModule.resume();
            })();
            return { isReplay: true }
        }

        if (pays >= 3) {
            loopPaySound = 'pay4'
        }
        if (pays >= 12) {
            loopPaySound = 'pay12'
        }

        if (loopPaySound) {
            sounder.playSound(loopPaySound, seLoopFlag);
        }

        if (replayFlag) {
            sounder.playSound('bet')
            sounder.playSound('replay');
        }
        // SlotLog('payStart');
        while (pays--) {
            slotHandler.saveData.coin++;
            payCount++;
            slotHandler.saveData.outCoin++;
            slotHandler.saveData.coinLog[slotHandler.saveData.coinLog.length - 1]++;
            changeCredit(1);
            Segments.payseg.setSegments(payCount)
            await Sleep(50);
        }
        if (loopPaySound && seLoopFlag) {
            sounder.stopSound(loopPaySound);
            loopPaySound = null;
        }
        return { isReplay: replayFlag };
    }
    let jacFlag = false;
    let firstHit = false;
    slotModule.onLot = async() => {
        /**
         * 抽選処理
         * retに制御名を返す
         * Lotterクラスを使うと便利
         * lotdata.jsに各フラグの成立確率を記述しよう
         * フラグから制御への振り分けもココで行う。
         * サンプルだとスイカ1とスイカ2の振り分け
         * window.powerはデバッグの強制フラグ用
         */
        const { effectManeger } = slotHandler;



        let ret = -1;
        let lotter = Lotdata[gameMode] && new Lotter(Lotdata[gameMode]);

        let lot = window.power || (lotter ? lotter.lot().name : null);
        if (!bonusFlag) {
            lot = slotModule.RTdata.onLot(lot) || lot
        }
        window.power = null;


        switch (gameMode) {
            case "normal":
                switch (lot) {
                    case "リプレイ":
                        ret = 'リプレイ' + Rand(3, 1);
                        break;
                    case "ベル":
                        ret = "ベル" + Rand(6, 1);
                        break
                    case 'チャンス目A':
                    case 'チャンス目B':
                    case "スイカ":
                    case "リプレイ1":
                    case "リプレイ2":
                    case "リプレイ3":
                        ret = lot;
                        break;
                    case 'リプレイ+ダイヤモンド':
                        ret = '共通リプレイ';
                        bonusFlag = 'ダイヤモンド'
                        break
                    case 'スイカ+ダイヤモンド':
                        ret = 'スイカ';
                        bonusFlag = 'ダイヤモンド'
                        break
                    case 'チャンス目A+ダイヤモンド':
                        ret = 'チャンス目A';
                        bonusFlag = 'ダイヤモンド'
                        break
                    case 'チャンス目B+ダイヤモンド':
                        ret = 'チャンス目B';
                        bonusFlag = 'ダイヤモンド'
                        break
                    case '単独ダイヤモンド':
                        ret = 'ダイヤモンド';
                        bonusFlag = 'ダイヤモンド'
                        break
                    default:
                        ret = "はずれ"
                        if (bonusFlag) ret = 'ダイヤモンド'
                }
                break;
            case 'Diamond':
                ret = 'ボーナス小役1';
                if (!Rand(32)) {
                    ret = 'ボーナス小役2'
                }

        }
        console.log({ lot, ret, RTdata: slotModule.RTdata, effectManeger })

        await effectManeger.onLot(lot, ret, gameMode, bonusFlag);
        return Control.code.indexOf(ret);
    }
    slotModule.onReelStop = async() => {
        sounder.playSound("stop")
    }


    slotModule.on("reelStart", async() => {
        if (leverEffect !== '無音') sounder.playSound("start")
        leverEffect = null;

    })
    window.leverEffect = null;


    window.gameMode = 'normal';
    let bonusFlag = null
    let coin = 0;
    window.bonusData = null

    slotModule.on("leverOn", () => {
        // レバーオン時の処理
        // セーブデータの更新を行う
        slotHandler.saveData.nextGame(slotModule.slotStatus.betCoin);
        changeCredit(0)
    })

    function setGamemode(mode) {
        oldGameMode = gameMode;
        console.log(`${gameMode} -> ${mode}`);
        const { LOTMODE } = slotModule.reelController;
        switch (mode) {
            case 'normal':
                gameMode = 'normal';
                slotModule.reelController.mode = LOTMODE.NORMAL
                slotStatus.maxBet = 3;
                break
            case 'Diamond':
                gameMode = 'Diamond';
                slotModule.reelController.mode = LOTMODE.BIG
                slotStatus.maxBet = 1;
                break
        }
    }
    const Segments = {
        creditseg: segInit("#creditSegment", 2),
        payseg: segInit("#paySegment", 2),
        effectseg: segInit("#effectSegment1", 3),
        dekaseg: segInit("#effectSegment2", 3)
    }
    let credit = 50;
    Segments.creditseg.setSegments(50);
    Segments.creditseg.setOffColor(80, 30, 30);
    Segments.payseg.setOffColor(80, 30, 30);
    Segments.effectseg.setOffColor(5, 5, 5);
    Segments.dekaseg.setOffColor(5, 5, 5);
    Segments.creditseg.reset();
    Segments.payseg.reset();
    Segments.effectseg.reset();
    Segments.dekaseg.reset();

    slotHandler.Segments = Segments;

    let lotgame;

    function changeCredit(delta) {
        credit += delta;
        if (credit < 0) {
            credit = 0;
        }
        if (credit > 50) {
            credit = 50;
        }
        $(".GameData").html(`
            差枚数:${slotHandler.saveData.coin}枚<br>
            ゲーム数:${slotHandler.saveData.playCount}G<br>
            総ゲーム数:${slotHandler.saveData.allPlayCount}G<br>
            機械割:${(''+slotHandler.saveData.percentage).slice(0,5)}%<br>
        `)
        Segments.creditseg.setSegments(credit)
    }


    let RandomSegIntervals = [false, false, false];



    function segInit(selector, size) {
        let cangvas = $(selector)[0];
        let sc = new SegmentControler(cangvas, size, 0, -3, 50, 30);
        sc.setOffColor(120, 120, 120)
        sc.setOnColor(230, 0, 0)
        sc.reset();
        return sc;
    }
}