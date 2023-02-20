var W = 4;
var L = [];

function add(lv, v) {
    if (lv == L.length) {           // new level
        L.push([v]);
    } else if (L[lv].length < W) {  // not full
        L[lv].push(v);
    } else {                        // full
        var d = digest(L[lv]);
        L[lv] = [v];
        add(lv + 1, d);             // tail recursion
    }
}

function digest(vs) {
    var tmp = vs.flat();
    return [tmp[0], tmp[tmp.length - 1]];
}

function show() {
    console.log("====");
    for (let i = L.length - 1; i >= 0; i--) {
        console.log(L[i].join("\t"));
    }
}

for (let i = 0; i < 30; i++) {
    add(0, i);
    show();
}
