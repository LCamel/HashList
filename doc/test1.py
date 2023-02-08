from manim import *

class A(Scene):
    def construct(self):
        self.add(NumberPlane())
        s = Square(2)
        s.set_x(0, LEFT)
        s.set_y(0, DOWN)
        self.add(s)
        p = s.get_edge_center(DOWN)
        print(p)


        s2 = Square()
        s2.move_to(RIGHT * 2 + DOWN * 3)
        self.add(s2)
        p2 = s2.get_edge_center(UP)
        print(p2)

        l = Line(p, p2)
        self.add(l)
    
