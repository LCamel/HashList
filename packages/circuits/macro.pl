#!/usr/bin/env perl
while (<>) {
    # loop: can be used for vector/matrix assignment
    if (/^\s*@(\w+)(.*)/) {
        $orig = $_;
        $v1 = $1;
        $l = $2;
        if ($v eq "component") {

        } else {
            if ($l =~ /^@@(\w+)(.*)/) {
                $v2 = $1;
                $l = $2;
                $l =~ s/@\*/[idx1][idx2]/g;
                $l =~ s/@.@@/[idx1][idx2]/g;
                $l =~ s/@@.@/[idx2][idx1]/g;
                $l =~ s/@@/[idx2]/g;
                $l =~ s/@/[idx1]/g;
                $l = qq(for (var idx2 = 0; idx2 < $v2; idx2++) { $l });
                $l = qq(for (var idx1 = 0; idx1 < $v1; idx1++) { $l });
            } else {
                $l =~ s/@\*/[idx1]/g;
                $l =~ s/@/[idx1]/g;
                $l = qq(for (var idx1 = 0; idx1 < $v1; idx1++) { $l });
            }
        }
        $orig =~ s/^(\s*)@/$1\/\/ @/;
        print $orig;
        print "$1$l\n";
    } else {
        print $_;
    }
}
