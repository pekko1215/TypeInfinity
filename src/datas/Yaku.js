/**
 * Created by pekko1215 on 2017/07/15.
 */

const BellPayCoin = 15;

const DummyFlash = {
    "中段": [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    "上段": [
        [1, 1, 1],
        [0, 0, 0],
        [0, 0, 0]
    ],
    "下段": [
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 1]
    ],
    "右下がり": [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ],
    "右上がり": [
        [0, 0, 1],
        [0, 1, 0],
        [1, 0, 0]
    ],
    "なし": [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ],
    "ベル小V": [
        [1, 0, 1],
        [0, 1, 0],
        [0, 0, 0]
    ]
}

const YakuData = [{
        name: "リプレイ",
        pay: [0, 0, 0]
    },
    {
        name: "ベル",
        pay: [2, 15, 15]
    },
    {
        name: "ベル",
        flashLine: DummyFlash.なし,
        pay: [2, 0, 0]
    },
    {
        name: "ベル",
        flashLine: DummyFlash.なし,
        pay: [2, 0, 0]
    },
    {
        name: "ベル",
        flashLine: DummyFlash.なし,
        pay: [2, 0, 0]
    },
    {
        name: "スイカ",
        pay: [3, 0, 0]
    },
    {
        name: "7揃い",
        pay: [0, 0, 0],
        flashLine: DummyFlash['なし']
    },
    {
        name: "BAR",
        pay: [0, 0, 0],
        flashLine: DummyFlash['なし']
    },
    {
        name: "ダイヤモンド",
        pay: [0, 0, 0],
    },
    {
        name: "転落リプレイ",
        pay: [0, 0, 0],
        flashLine: DummyFlash.なし
    },
    {
        name: 'ボーナス小役1',
        pay: [0, 0, 2],
        flashLine: DummyFlash.なし
    },
    {
        name: 'ボーナス小役2',
        pay: [0, 0, 15],
        flashLine: DummyFlash.なし
    }
]