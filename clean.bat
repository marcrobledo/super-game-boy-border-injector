@echo off

SET TARGET_FILENAME=output.gb

del roms\%TARGET_FILENAME%
del roms\*.sym
del src\*.obj