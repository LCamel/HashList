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
