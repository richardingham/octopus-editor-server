
#Installation instructions

##Windows

**Prerequisites:**

1. Install Python 2.7
2. Install node.js
3. Install PyWin32
4. Install PySerial

```
pip install wheel
pip install twisted
pip install -i https://pypi.binstar.org/carlkl/simple numpy
pip install -i https://pypi.binstar.org/carlkl/simple scipy
pip install pandas
pip install pillow
pip install autobahn
pip install xlrd
pip install xlsxwriter
```

**For computer vision:**

1. Download OpenCV 2.3 Superpack: http://sourceforge.net/projects/opencvlibrary/files/opencv-win/2.3.1/OpenCV-2.3.1-win-superpack.exe/download 
2. Run the executable file and when it asks where to extract to, use: C:\OpenCV2.3\
3. Install Pygame for windows: http://pygame.org/ftp/pygame-1.9.1.win32-py2.7.msi
4. `pip install ipython`
5. `easy_install pyreadline`
6. `easy_install cython`
7. `pip install https://github.com/sightmachine/SimpleCV/zipball/1.3`

### From a zip file

1. Unpack zip file into a working directory, such as [My Documents]\octopus-editor-server.
2. Add this folder to your PYTHONPATH.
3. Double click on “Start Server”
4. Load up http://localhost:8001/ in a web browser (Chrome or Firefox or Safari).

### From source repository

1. Download source zip and unpack:
  1. https://github.com/richardingham/octopus-editor-server/archive/master.zip
  2. https://github.com/richardingham/octopus/archive/0.2.zip into directory ‘octopus’ within the ‘octopus-editor-server’ directory.

2. Add this folder to your PYTHONPATH.

3. In the ‘octopus-editor-server’ directory, run:

   ```
   npm install
   bower install
   grunt browserify
   grunt concat
   python server/createdb.py
   ```
   
4. To make a desktop shortcut to start the server, create a shortcut to “C:\Windows\System32\cmd.exe /k twistd.py octopus-editor” which runs in the appropriate directory (e.g. "C:\Users\[ your user ]\Documents\octopus-editor-server").

## Linux

```
sudo apt-get install python python-setuptools python-pip python-serial nodejs
sudo pip install wheel
sudo pip install twisted autobahn
sudo pip install numpy scipy pandas pillow
sudo pip install xlrd xlsxwriter

sudo apt-get install ipython python-opencv python-pygame
sudo pip install https://github.com/sightmachine/SimpleCV/zipball/1.3

git clone https://github.com/richardingham/octopus-editor-server.git

cd octopus-editor-server

git clone https://github.com/richardingham/octopus.git 

npm install
bower install
grunt browserify
grunt concat
python server/createdb.py

twistd octopus-editor-server
```

