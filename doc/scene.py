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
    lam = lambda: Line(o0.get_edge_center(dir0), o1.get_edge_center(dir1))
    line = lam()
    scene.add(line)
    line.add_updater(lambda mobj: mobj.become(lam()))
    return line

config.frame_width=20  # set frame_height doesn't work

class A(MovingCameraScene):

    def construct(self):
        #self.add(NumberPlane())

        items = SquareList(10, 0, -2)
        self.add(items)

        level = SquareList(4, 0, 0)
        self.add(level)

        lines = [ connect(self, items.square(i), UP, level.square(0), DOWN) for i in range(4) ]

        self.play(*[Create(line) for line in lines])
        self.play(level.square(0).animate.set_fill(BLUE, opacity=0.5))  # opacity is mandatary

        self.play(items.animate.shift(LEFT * 4))
        self.wait(1)

