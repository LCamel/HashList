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

describe("PickOne", function () {
    this.timeout(200000);

    it("PickOne", async () => {
        const circuit = await getTestCircuit("PickOne.circom")

        var witness = await circuit.calculateWitness({
            in: [100, 200, 300, 400],
            sel: 2
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, {out: 300});

        await expect(circuit.calculateWitness({
            in: [100, 200, 300, 400],
            sel: 4 // out of bound
        })).to.be.rejected;
    });
});

describe("PickOne2D", function () {
    this.timeout(200000);

    it("PickOne2D", async () => {
        const circuit = await getTestCircuit("PickOne2D.circom")

        const arr = [[7, 5, 8, 8, 9],
                     [2, 5, 8, 3, 9],
                     [8, 5, 4, 8, 6]];
        var witness = await circuit.calculateWitness({
            in: arr,
            row: 2,
            col: 4
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, {out: 6});

        witness = await circuit.calculateWitness({
            in: arr,
            row: 1,
            col: 0
        });
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, {out: 2});

        await expect(circuit.calculateWitness({
            in: arr,
            row: 3, // out of bound
            col: 2
        })).to.be.rejected;

        await expect(circuit.calculateWitness({
            in: arr,
            row: 0,
            col: 5 // out of bound
        })).to.be.rejected;
    });
});
