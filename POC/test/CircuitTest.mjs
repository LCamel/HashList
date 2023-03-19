// SEE: https://github.com/iden3/circuits/blob/a6aa4641f9b8736fab3e721be727701890d2a85e/test/comparators.test.ts
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fileURLToPath } from 'url';
import * as path from "path";
import { wasm as tester } from "circom_tester";
import { Tower, DigestDigestTower } from "../src/Dev.mjs";
import { pad0, pad00, padInput, buildL, buildMerkleProofAndLocateRoot, getLengths } from "../src/Proof.mjs";
import { poseidon } from "circomlibjs";
import * as tmpfile from "tmp";
import * as fs from "fs";

chai.use(chaiAsPromised);


const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function getTestCircuit(circuitName, args) {
    let src = path.join(__dirname, "..", "src", "HashTowerWithHashList.circom");
    let content = `
pragma circom 2.1.4;
include "${src}";
component main = ${circuitName}(${args});
    `;
    let fileHavingMain = tmpfile.fileSync().name;
    fs.writeFileSync(fileHavingMain, content);
    //console.log("fileHavingMain: ", fileHavingMain);
    return await tester(
        fileHavingMain,
        { reduceConstraints: false }
    );
}
async function good(circuit, input, output) {
    let witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, output);
}
async function bad(circuit, input) {
    await expect(circuit.calculateWitness(input)).to.be.rejected;
}

describe("PickOne", function () {
    this.timeout(200000);

    it("PickOne", async () => {
        const circuit = await getTestCircuit("PickOne", [4]);

        await good(circuit, {
            in: [100, 200, 300, 400],
            sel: 2
        }, {
            out: 300
        });

        await bad(circuit, {
            in: [100, 200, 300, 400],
            sel: 4 // out of bond
        });
    });
});
/*
describe("PickOne2D", function () {
    this.timeout(200000);

    it("PickOne2D", async () => {
        const circuit = await getTestCircuit("PickOne2D", [3, 5]);

        const arr = [[7, 5, 8, 8, 9],
                     [2, 5, 8, 3, 9],
                     [8, 5, 4, 8, 6]];
        await good(circuit, {
            in: arr,
            row: 2,
            col: 4
        }, {
            out: 6
        });
        await good(circuit, {
            in: arr,
            row: 1,
            col: 0
        }, {
            out: 2
        });

        await bad(circuit, {
            in: arr,
            row: 3, // out of bound
            col: 2
        });
        await bad(circuit, {
            in: arr,
            row: 0,
            col: 5 // out of bound
        });
    });
});
*/
describe("H2", function () {
    this.timeout(200000);

    it("H2", async () => {
        const circuit = await getTestCircuit("H2", []);

        // BigInt or string
        await good(circuit, {
            in: [0, 1],
        }, {
            out: 12583541437132735734108669866114103169564651237895298778035846191048104863326n
        });
        await good(circuit, {
            in: [1, 2],
        }, {
            out: "7853200120776062878684798364095072458815029376092732009249414926327459813530"
        });
    });
});

describe("HashListH2", function () {
    this.timeout(200000);

    it("HashListH2", async () => {
        const circuit = await getTestCircuit("HashListH2", [4]);

        await good(circuit, { in: [0, 1, 2, 3], len: 0 }, {
            out: 0
        });
        await good(circuit, { in: [0, 1, 2, 3], len: 1 }, {
            out: 0
        });
        await good(circuit, { in: [0, 1, 2, 3], len: 2 }, {
            out: 12583541437132735734108669866114103169564651237895298778035846191048104863326n
        });
        await good(circuit, { in: [0, 1, 2, 3], len: 3 }, {
            out: 11790059851550142146278072775670916642282838830554510149311470233718605478544n
        });
        await good(circuit, { in: [0, 1, 2, 3], len: 4 }, {
            out: 20127075603631019434055928315203707068407414306847615530687456290565086592967n
        });


        await good(circuit, { in: [100, 200, 300, 400], len: 0 }, {
            out: 0
        });
        await good(circuit, { in: [100, 200, 300, 400], len: 1 }, {
            out: 100
        });
        await good(circuit, { in: [100, 200, 300, 400], len: 2 }, {
            out: 3699275827636970843851136077830925792907611923069205979397427147713774628412n
        });
        await good(circuit, { in: [100, 200, 300, 400], len: 3 }, {
            out: 3925045059169335782833407477321845405342042180089864692501953598893457304808n
        });
        await good(circuit, { in: [100, 200, 300, 400], len: 4 }, {
            out: 14874163058214740000325542972470514093833183500825720625361773479542469519892n
        });


        await bad(circuit, { in: [100, 200, 300, 400], len: 5 });
    });
});
/*
describe("MustLT", function () {
    this.timeout(200000);

    it("MustLT", async () => {
        const circuit = await getTestCircuit("MustLT", [3]);

        await good(circuit, { a: 1, b: 2 }, {});
        await good(circuit, { a: 0, b: 7 }, {});

        await bad(circuit, { a: 2, b: 2 });
        await bad(circuit, { a: 0, b: 0 });

        // it will never pass for bad out-of-bound inputs
        await bad(circuit, { a: 8, b: 8 });
        await bad(circuit, { a: 9, b: 7 });
        await bad(circuit, { a: 9, b: 8 });
        await bad(circuit, { a: 200, b: 100 });

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (i < j) {
                    await good(circuit, { a: i, b: j }, {});
                } else {
                    await bad(circuit, { a: i, b: j });
                }
            }
        }
    });
});
*/
describe("Reverse", function () {
    this.timeout(200000);

    it("Reverse", async () => {
        const circuit = await getTestCircuit("Reverse", [4]);

        await good(circuit, { in: [6, 7, 8, 9] }, { out: [9, 8, 7, 6]});
    });
});

describe("RotateLeft", function () {
    this.timeout(200000);

    it("RotateLeft", async () => {
        const circuit = await getTestCircuit("RotateLeft", [4]);

        await good(circuit, { in: [100, 200, 300, 400], n: 0 }, {
            out: [100, 200, 300, 400]
        });
        await good(circuit, { in: [100, 200, 300, 400], n: 1 }, {
            out: [200, 300, 400, 100]
        });
        await good(circuit, { in: [100, 200, 300, 400], n: 2 }, {
            out: [300, 400, 100, 200]
        });
        await good(circuit, { in: [100, 200, 300, 400], n: 3 }, {
            out: [400, 100, 200, 300]
        });

        await bad(circuit, { in: [100, 200, 300, 400], n: 4 });  // out of bond
    });
});
/*
describe("CheckDigestAndPickRoot", function () {
    this.timeout(200000);

    it("CheckDigestAndPickRoot", async () => {
        const circuit = await getTestCircuit("CheckDigestAndPickRoot", [5, 4]);

        const digest = (vs) => vs.reduce((acc, v) => poseidon([acc, v]));

        const H = 5;
        const W = 4;
        const t = Tower(W, digest);
        for (let i = 0n; i < 85; i++) {
            t.add(i);

            //let rootLevel = 0;
            //let rootIdxInL = 0;
            let INPUT = {
                L: pad00(t.L, H, W),
                LL: pad0(t.L.map(l => l.length), H),
                h: t.L.length,
                dd: digest(t.L.map(digest).reverse()),
                //rootLevel,
                //rootIdxInL
            };
            for (let lv = 0; lv < t.L.length; lv++) {
                for (let j = 0; j < t.L[lv].length; j++) {
                    INPUT.rootLevel = lv;
                    INPUT.rootIdxInL = j;
                    await good(circuit, INPUT, { root: t.L[lv][j] });
                }
            }
            //console.log(JSON.stringify(INPUT, undefined, 4));
        };
    });
});
*/
/*
describe("NotEqual", function () {
    this.timeout(200000);

    it("NotEqual", async () => {
        const circuit = await getTestCircuit("NotEqual.circom");

        await good(circuit, { a: 1, b: 2 }, { out: 1 });
        await good(circuit, { a: 2, b: 2 }, { out: 0 });
    });
});
*/
/*
describe("CheckMerkleProof", function () {
    this.timeout(200000);

    it("CheckMerkleProof", async () => {
        const circuit = await getTestCircuit("CheckMerkleProof", [5, 4]);

        const digest = (vs) => vs.reduce((acc, v) => poseidon([acc, v]));
        //let H = 5;
        //let W = 4;
        let C = [];
        C[0] = [3, 4, 5, 6];
        C[1] = [2, digest(C[0]), 4, 8];
        C[2] = [5, 9, 7, digest(C[1])];
        C[3] = [7, 6, digest(C[2]), 0];
        C[4] = [0, 0, 0, 0];
        let INPUT = { C, CI: [3, 1, 3, 2, 0], rootLevel: 3 };

        await good(circuit, INPUT, { root: C[3][2], leaf: 6 });
    });
});
*/
/*
describe("CheckLLAndh", function () {
    this.timeout(200000);

    it("CheckLLAndh", async () => {
        const circuit = await getTestCircuit("CheckLLAndh", [5, 4]);
        let INPUT = { LL: [1, 2, 1, 0, 0], h: 3, count: 1 + 2 * 4 + 1 * 16 };
        await good(circuit, INPUT, { });
    });
});
*/
/*
describe("HashTowerWithDigest", function () {
    this.timeout(200000);
    it("HashTowerWithDigest", async () => {
        const circuit = await getTestCircuit("HashTowerWithDigest", [5, 4]);
        const H = 5;
        const W = 4;
        let incDigest = (acc, v, i) => (i == 0) ? v : poseidon([acc, v]);
        let t = DigestDigestTower(W, incDigest, incDigest);
        let eventFetcher = (lv, start, len) => t.E[lv].slice(start, start + len);

        for (let i = 0; i < 25; i++) {
            t.add(i);
            let count = i + 1;
            let L = buildL(count, W, eventFetcher);
            for (let j = 0; j <= i; j++) {
                let INPUT = padInput(W, H, count, t.DD[0], L,
                    ...buildMerkleProofAndLocateRoot(count, W, eventFetcher, j));
                await good(circuit, INPUT, { });
            }
        }
    });
});
*/

// this test does NOT proof that the circuit has enough constraints
describe("Compute_LL_h", function () {
    this.timeout(200000);
    it("Compute_LL_h", async () => {
        const H = 3;
        const W = 4;
        const H_BITS = 3;
        const W_BITS = 3;

        const circuit = await getTestCircuit("Compute_LL_h", [H, W, H_BITS, W_BITS]);
        for (let count = 0; count <= 84; count++) {
            let [_, LL] = getLengths(count, W);
            let h = LL.length;
            LL = pad0(LL, H);
            await good(circuit, { count }, { LL, h });
        }
    });
});

describe("Include", function () {
    this.timeout(200000);
    it("Include", async () => {
        const N = 4;

        const circuit = await getTestCircuit("Include", [N]);
        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 7 }, { "out": 1 });
        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 2 }, { "out": 1 });
        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 3 }, { "out": 1 });
        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 6 }, { "out": 1 });

        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 8 }, { "out": 0 });
        await good(circuit, { "in": [ 7, 2, 3, 6 ], "v": 0 }, { "out": 0 });

        await good(circuit, { "in": [ 0, 2, 3, 6 ], "v": 0 }, { "out": 1 });
        await good(circuit, { "in": [ 7, 2, 3, 0 ], "v": 0 }, { "out": 1 });
    });
});

describe("LessThanArray", function () {
    this.timeout(200000);
    it("LessThanArray N = 4", async () => {
        const N = 4;
        const circuit = await getTestCircuit("LessThanArray", [N]);
        await good(circuit, { "v": 0 }, { "out": [0, 0, 0, 0] });
        await good(circuit, { "v": 1 }, { "out": [1, 0, 0, 0] });
        await good(circuit, { "v": 2 }, { "out": [1, 1, 0, 0] });
        await good(circuit, { "v": 3 }, { "out": [1, 1, 1, 0] });
        await good(circuit, { "v": 4 }, { "out": [1, 1, 1, 1] });
        await bad(circuit, { "v": 5 });
    });
    it("LessThanArray N = 2", async () => {
        const N = 2;
        const circuit = await getTestCircuit("LessThanArray", [N]);
        await good(circuit, { "v": 0 }, { "out": [0, 0] });
        await good(circuit, { "v": 1 }, { "out": [1, 0] });
        await good(circuit, { "v": 2 }, { "out": [1, 1] });
        await bad(circuit, { "v": 3 });
    });
    it("LessThanArray N = 1", async () => {
        const N = 1;
        const circuit = await getTestCircuit("LessThanArray", [N]);
        await good(circuit, { "v": 0 }, { "out": [0] });
        await good(circuit, { "v": 1 }, { "out": [1] });
        await bad(circuit, { "v": 2 });
    });
    it("LessThanArray N = 0 should fail", async () => {
        const N = 0;
        await expect(getTestCircuit("LessThanArray", [N])).to.be.rejected;
    });
});

describe("IncludeInPrefix", function () {
    this.timeout(200000);
    it("IncludeInPrefix N = 4", async () => {
        const N = 4;
        const circuit = await getTestCircuit("IncludeInPrefix", [N]);
        const _in = [8, 6, 10, 9];
        await good(circuit, { in: _in, prefixLen: 2, v: 6 }, { out: 1 });
        await good(circuit, { in: _in, prefixLen: 2, v: 9 }, { out: 0 });
        await good(circuit, { in: _in, prefixLen: 0, v: 8 }, { out: 0 });
        await good(circuit, { in: _in, prefixLen: 1, v: 8 }, { out: 1 });
        await good(circuit, { in: _in, prefixLen: 4, v: 42 }, { out: 0 });

        for (let prefixLen = 0; prefixLen <= N; prefixLen++) {
            for (let v of _in.concat(42, 77)) {
                let out = _in.slice(0, prefixLen).includes(v) ? 1 : 0;
                await good(circuit, { "in": _in, prefixLen, v }, { out });
            }
        }
    });
});

describe("MerkleRoot", function () {
    this.timeout(200000);

    it("MerkleRoot", async () => {
        const circuit = await getTestCircuit("MerkleRoot", [5, 4]);

        const digest = (vs) => vs.reduce((acc, v) => poseidon([acc, v]));
        //let H = 5;
        //let W = 4;
        let C = [];
        C[0] = [3, 4, 5, 6];
        C[1] = [2, digest(C[0]), 4, 8];
        C[2] = [5, 9, 7, digest(C[1])];
        C[3] = [7, 6, digest(C[2]), 0];
        await good(circuit, { C, rootLv: 4, leaf: 3 }, { root: digest(C[3]) });
        await good(circuit, { C, rootLv: 4, leaf: 4 }, { root: digest(C[3]) });
        await good(circuit, { C, rootLv: 4, leaf: 5 }, { root: digest(C[3]) });
        await good(circuit, { C, rootLv: 4, leaf: 6 }, { root: digest(C[3]) });
        await bad(circuit, { C, rootLv: 4, leaf: 2 }); // non exist leaf
        C[2][1] = 42; // break the proof
        await bad(circuit, { C, rootLv: 4, leaf: 6 });

        C = [];
        C[0] = [3, 4, 5, 6];
        C[1] = [2, digest(C[0]), 4, 8];
        C[2] = [5, 9, 7, digest(C[1])];
        C[3] = [0, 0, 0, 0];
        await good(circuit, { C, rootLv: 3, leaf: 3 }, { root: digest(C[2]) });
        await good(circuit, { C, rootLv: 3, leaf: 4 }, { root: digest(C[2]) });
        await good(circuit, { C, rootLv: 3, leaf: 5 }, { root: digest(C[2]) });
        await good(circuit, { C, rootLv: 3, leaf: 6 }, { root: digest(C[2]) });
        C[3] = [8, 9, 10, 11]; // don't care
        await good(circuit, { C, rootLv: 3, leaf: 3 }, { root: digest(C[2]) });

        C = [];
        C[0] = [3, 4, 5, 6];
        C[1] = [0, 0, 0, 0];
        C[2] = [0, 0, 0, 0];
        C[3] = [0, 0, 0, 0];
        await good(circuit, { C, rootLv: 1, leaf: 3 }, { root: digest(C[0]) });
        await good(circuit, { C, rootLv: 1, leaf: 4 }, { root: digest(C[0]) });
        await good(circuit, { C, rootLv: 1, leaf: 5 }, { root: digest(C[0]) });
        await good(circuit, { C, rootLv: 1, leaf: 6 }, { root: digest(C[0]) });
        C[1] = [8, 9, 10, 11]; // don't care
        await good(circuit, { C, rootLv: 1, leaf: 3 }, { root: digest(C[0]) });

        C = [];
        C[0] = [3, 4, 5, 6]; // don't care
        C[1] = [0, 1, 2, 0];
        C[2] = [0, 3, 4, 0];
        C[3] = [0, 0, 0, 0];
        await good(circuit, { C, rootLv: 0, leaf: 42 }, { root: 42 });
    });
});
