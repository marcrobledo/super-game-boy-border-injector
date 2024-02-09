@echo off

SET SOURCE_FILENAME=input.gb
SET TARGET_FILENAME=output.gb



REM delete current assembled rom
IF EXIST .\roms\%TARGET_FILENAME% del .\roms\%TARGET_FILENAME%

SET OBJ_FILENAME=%TARGET_FILENAME:.gb=.obj%
SET SYM_FILENAME=%TARGET_FILENAME:.gb=.sym%

cd src
:begin
set assemble=1
echo assembling...
..\rgbds\rgbasm -o%OBJ_FILENAME% main.asm
if errorlevel 1 goto error
echo linking...
REM -n generates a sym file with subroutines name and offsets for debugger
..\rgbds\rgblink -o../roms/%TARGET_FILENAME% -O./../roms/%SOURCE_FILENAME% -n../roms/%SYM_FILENAME% %OBJ_FILENAME% 
if errorlevel 1 goto error
echo fixing...
..\rgbds\rgbfix -p0 -v ../roms/%TARGET_FILENAME%
del %OBJ_FILENAME%
goto end
:error
pause
:end
cd..
