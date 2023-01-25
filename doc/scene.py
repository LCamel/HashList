from manim import *

def squareBottomLeftAt(x, y):
    s = Square(1)
    s.set_x(x, LEFT)
    s.set_y(y, DOWN)
    return s

class SquareList(VGroup):
    def __init__(self, len, x0, y0):
        super().__init__()
        for i in range(len):
            self.add(squareBottomLeftAt(x0 + i, y0))
    def square(self, i):
        return self.submobjects[i]

def connect(scene, o0, dir0, o1, dir1):
    creator = lambda: Line(o0.get_edge_center(dir0), o1.get_edge_center(dir1))
    updater = lambda mobj: mobj.become(creator())
    line = creator()
    scene.add(line)
    line.add_updater(updater)
    return line

def getLevelLengths(len, W, H):
    lengths = [0] * H
    zeroIfLessThan = 0  # W^0 + W^1 + W^2 ... (1 + 4 + 16 + ...)
    for lv in range(H):
        pow = W ** lv
        zeroIfLessThan += pow
        lvLen = 0 if len < zeroIfLessThan else (len - zeroIfLessThan) // pow % W + 1
        lengths[lv] = lvLen
        if lvLen == 0:
            break
    return lengths


config.frame_width=30  # set frame_height doesn't work

class A(MovingCameraScene):

    def construct(self):
        #self.add(NumberPlane())


        items = SquareList(21, 0, -2)
        self.add(items)

        W = 4
        H = 5

        lists = []
        for lv in range(H):
            list = SquareList(W, 0, lv * 2)
            lists.append(list)
            self.add(list)

        oldVGroups = [ VGroup() for lv in range(H) ]
        oldVGroups[0].add(items)

        for itemIdx in range(21):
            len = itemIdx
            lvLengths = getLevelLengths(len, W, H)
            firstNotFull = next(i for i, v in enumerate(lvLengths) if v < W)
            target = lvLengths[firstNotFull]
            for lv in range(firstNotFull - 1, -1, -1):
                ts = lists[lv + 1].square(target)
                lines = [ connect(self, lists[lv].square(i), UP, ts, DOWN) for i in range(W) ]
                self.play(*[Create(line) for line in lines])
                #self.wait(1)
                self.play(ts.animate.set_fill(BLUE, opacity=0.5))  # opacity is mandatary
                #self.wait(1)

                old = lists[lv]
                lists[lv] = lists[lv].copy()
                for s in lists[lv]: s.set_fill(BLACK, opacity=0.5)
                self.add(lists[lv])

                oldVGroups[lv].add(old)
                self.play(oldVGroups[lv].animate.shift(LEFT * 4))
                #self.play(*[s.animate.set_fill(BLACK, opacity=1) for s in lists[lv]])  # opacity is mandatary
                target = 0
                #self.wait(1)
            ts = lists[0].square(target)
            connect(self, items.square(itemIdx), UP, ts, DOWN)
            self.play(ts.animate.set_fill(BLUE, opacity=0.5))  # opacity is mandatary
            if firstNotFull > 0:
                self.wait(1)

        self.wait(5)

