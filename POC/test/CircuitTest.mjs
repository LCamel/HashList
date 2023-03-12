// SEE: https://github.com/iden3/circuits/blob/a6aa4641f9b8736fab3e721be727701890d2a85e/test/comparators.test.ts
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fileURLToPath } from 'url';
import * as path from "path";
import { wasm as tester } from "circom_tester";
//const F1Field = require("ffjavascript").F1Field;
//const Scalar = require("ffjavascript").Scalar;
//exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
//const Fr = new F1Field(exports.p);

chai.use(chaiAsPromised);


const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function getTestCircuit(fileHavingMain) {
    return await tester(
        path.join(__dirname, "circuits", fileHavingMain),
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
        const circuit = await getTestCircuit("PickOne.circom")

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

describe("PickOne2D", function () {
    this.timeout(200000);

    it("PickOne2D", async () => {
        const circuit = await getTestCircuit("PickOne2D.circom")

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

describe("H2", function () {
    this.timeout(200000);

    it("H2", async () => {
        const circuit = await getTestCircuit("H2.circom")

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
        const circuit = await getTestCircuit("HashListH2.circom")

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


describe("MustLT", function () {
    this.timeout(200000);

    it("MustLT", async () => {
        const circuit = await getTestCircuit("MustLT.circom")

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


describe("RotateLeft", function () {
    this.timeout(200000);

    it("RotateLeft", async () => {
        const circuit = await getTestCircuit("RotateLeft.circom")

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
