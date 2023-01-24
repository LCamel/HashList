

from manim import *

def p(x, y):
    return np.array([x, y, 0])
def b(x, y):
    s = Polygon(np.array([x, y, 0]),
                np.array([x+1, y, 0]),
                np.array([x+1, y+1, 0]),
                np.array([x, y+1, 0]))
    return s

def topToBottom(scene, b0, b1):
    lam = lambda: Line((b0.get_vertices()[3] + b0.get_vertices()[2]) / 2, (b1.get_vertices()[0] + b1.get_vertices()[1]) / 2)
    line = lam()
    scene.add(line)
    return line, lam

class Boxes:
    def __init__(self, len, x0, y0):
        self.len = len
        self.x0 = x0
        self.y0 = y0
        self.boxes = [b(x0 + i, y0) for i in range(len)]
        self.vGroup = VGroup()
        for b1 in self.boxes:
            self.vGroup.add(b1)

# !!!
config.frame_width=30

class A(MovingCameraScene):

    def construct(self):
        self.add(NumberPlane())

        bs = Boxes(10, 0, -2)
        self.add(bs.vGroup)

        b0 = b(2, 2)  # will be added later for Create()

        lines = []
        lineLams = []
        for i in range(4):
            line, lineLam = topToBottom(self, bs.boxes[i], b0)
            lines.append(line)
            lineLams.append(lineLam)

        self.play(*[Create(lines[i]) for i in range(4)])
        self.play(Create(b0))
        #self.wait(1)

        for i in range(4):
            lines[i].add_updater(lambda mobj, i=i: mobj.become(lineLams[i]()))

        self.play(bs.vGroup.animate.shift(LEFT * 4))
        self.wait(1)

