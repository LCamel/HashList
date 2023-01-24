from manim import *

def b(x, y):
    s = Square(1)
    s.set_x(x, LEFT)
    s.set_y(y, DOWN)
    return s

def connect(scene, b0, dir0, b1, dir1):
    lam = lambda: Line(b0.get_edge_center(dir0), b1.get_edge_center(dir1))
    line = lam()
    scene.add(line)
    line.add_updater(lambda mobj: mobj.become(lam()))
    return line

class Boxes:
    def __init__(self, len, x0, y0):
        self.len = len
        self.x0 = x0
        self.y0 = y0
        self.boxes = [b(x0 + i, y0) for i in range(len)]
        self.vGroup = VGroup()
        for b1 in self.boxes:
            self.vGroup.add(b1)


config.frame_width=20  # set frame_height doesn't work

class A(MovingCameraScene):

    def construct(self):
        #self.add(NumberPlane())

        bs = Boxes(10, 0, -2)
        self.add(bs.vGroup)

        bs2 = Boxes(4, 0, 0)
        self.add(bs2.vGroup)
        b0 = bs2.boxes[0]

        lines = [ connect(self, bs.boxes[i], UP, b0, DOWN) for i in range(4) ]

        self.play(*[Create(line) for line in lines])
        self.play(b0.animate.set_fill(BLUE, opacity=0.5))  # opacity is mandatary

        self.play(bs.vGroup.animate.shift(LEFT * 4))
        self.wait(1)

