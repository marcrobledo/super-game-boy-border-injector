#!/bin/sh

source_filename='input.gb'
target_filename='output.gb'

if [ -f $target_filename ]; then
    rm $target_filename
fi

cd src
export assemble=1

echo "assembling..."
../rgbds/rgbasm -ooutput.obj main.asm
if [ $? -eq 1 ]
then
    echo "Failed assembling"
    exit 1
fi

echo "linking..."
../rgbds/rgblink -o../roms/$target_filename -O./../roms/$source_filename -n../roms/output.sym output.obj 
if [ $? -eq 1 ]
then
    echo "Failed linking"
    exit 1
fi

echo "fixing..."
../rgbds/rgbfix -p0 -v ../roms/$target_filename
rm output.obj
cd ..
