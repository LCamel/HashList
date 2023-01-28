from manim import *

def squareBottomLeftAt(x, y):
    s = Square(1)
    s.set_x(x, LEFT)
    s.set_y(y, DOWN)
    return s

class SquareList(VGroup):
    def __init__(self, len, x0, y0):
        super().__init__()
        self.length = len
        for i in range(len):
            self.add(squareBottomLeftAt(x0 + i, y0))
    def square(self, i):
        return self.submobjects[i]
    def setText(self, i, t):
        text = Text(t)
        text.move_to(self.square(i).get_center())
        self.add(text)

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

        items = SquareList(64*1 + 16*2 + 4*2 + 1*1, 0, -2)
        #items = SquareList(21, 0, -2)
        #items = SquareList(9, 0, -2)
        for i in range(items.length):
            items.setText(i, str(i))
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

        addingText = Text("adding ")
        addingText.shift(DOWN * 4)
        self.add(addingText)
        for itemIdx in range(items.length):
            len = itemIdx
            lvLengths = getLevelLengths(len, W, H)
            firstNotFull = next(i for i, v in enumerate(lvLengths) if v < W)

            highlightedSquare = items.square(itemIdx).copy()
            highlightedSquare.color = YELLOW
            highlightedSquare.stroke_width *= 2
            oldVGroups[0].add(highlightedSquare)
            self.add(highlightedSquare)

            addingText.become(Text("adding " + str(itemIdx)), match_center=True)
            self.wait(1)

            fullTexts = []
            for lv in range(firstNotFull):
                t = Text("full ⇒ hash")
                t.next_to(lists[lv].square(W - 1), RIGHT)
                fullTexts.append(t)
                self.add(t)

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
                for s in old: s.set_fill(GRAY, opacity=0.5)

                oldVGroups[lv].add(old)
                self.remove(fullTexts[lv])
                self.play(oldVGroups[lv].animate.shift(LEFT * 4))
                target = 0

            ts = lists[0].square(target)
            line = Line(items.square(itemIdx).get_edge_center(UP), ts.get_edge_center(DOWN))
            rt = 1 if firstNotFull > 0 else 0.5
            self.play(ts.animate.set_fill(BLUE, opacity=0.5),
                      ShowPassingFlash(line.set_color(BLUE), time_width=10), run_time=rt)
            self.remove(line) # ?
            oldVGroups[0].remove(highlightedSquare)
            self.remove(highlightedSquare)
            if (firstNotFull > 0): self.wait(1)
        self.remove(addingText)
       

        lvLengths = getLevelLengths(items.length, W, H)
        print("########", lvLengths)
        shifts = []
        for lv in range(1, H):
            if (lvLengths[lv] == 0):
                break
            sqs = []
            for arr in oldVGroups[lv].submobjects:
                for sq in arr.submobjects:
                    sqs.append(sq) 
            for i in range(lvLengths[lv]):
                sqs.append(lists[lv].square(i))
            for i, sq in enumerate(sqs):
                x0 = sq.get_center()[0]
                x1 = items.square((i + 1) * (W ** lv) - 1).get_center()[0]
                shifts.append(sq.animate.shift(LEFT * (x0 - x1)))
        forWidth = VGroup(items.square(0), lists[0].square(W - 1))
        self.play(self.camera.frame.animate.move_to(
            [forWidth.get_center()[0], 0, 0]).set(width = forWidth.width + 4), run_time=2)
        self.wait(1)
        self.play(*shifts, run_time=3)

        self.wait(10)

