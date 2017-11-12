import os, glob
import subprocess
import wget
from distutils.dir_util import mkpath, copy_tree, remove_tree
from distutils.file_util import copy_file

import six
import octopus
import autobahn
import twisted.plugins

import server.createdb

pjoin = os.path.join

dist_dir = pjoin(os.getcwd(), "octopus-editor-server-dist")

server_src_dir = os.path.dirname(__file__)
octopus_src_dir = os.path.dirname(os.path.dirname(octopus.__file__))
autobahn_src_dir = os.path.dirname(autobahn.__file__)
twisted_plugin_dir = os.path.dirname(twisted.plugins.__file__)
six_dir = os.path.dirname(six.__file__)

origWD = os.getcwd()
os.chdir(server_src_dir)
subprocess.call(['grunt', 'browserify'], shell = True)
subprocess.call(['grunt', 'browserify'], shell = True)
os.chdir(origWD)

print 'Create Directory'
if os.path.isdir(dist_dir):
	remove_tree(dist_dir)

mkpath(dist_dir)

# octopus-editor-server/bower_components/*
# octopus-editor-server/components/*
# octopus-editor-server/resources/*
# octopus-editor-server/server/*
# octopus-editor-server/templates/*
# octopus-editor-server/twisted/*

print "Copy Server Components"
for dir in ['bower_components', 'resources', 'server', 'templates', 'twisted']:
	copy_tree(pjoin(server_src_dir, dir), pjoin(dist_dir, dir))

for file in ['Start Server.lnk']:
	copy_file(pjoin(server_src_dir, file), pjoin(dist_dir, file))

# del octopus-editor-server/components/octopus-editor/{core, blocks, generators}

#for dir in ['core', 'blocks', 'generators']:
#	remove_tree(pjoin(dist_dir, 'components', 'octopus-editor', dir))

# octopus/octopus/*
# octopus/tools/*
# octopus/twisted/*

print "Copy Octopus Components"
for dir in ['octopus', 'tools', 'twisted']:
	copy_tree(pjoin(octopus_src_dir, dir), pjoin(dist_dir, dir))

# autobahn
# twisted\plugins\autobahn_endpoints.py
# twisted\plugins\autobahn_twistd.py

print "Copy Autobahn Components"
copy_tree(autobahn_src_dir, pjoin(dist_dir, 'autobahn'))
for file in ['autobahn_endpoints.py', 'autobahn_twistd.py']:
	copy_file(pjoin(twisted_plugin_dir, file), pjoin(dist_dir, 'twisted', 'plugins', file))

copy_file(pjoin(six_dir, 'six.py'), pjoin(dist_dir, 'six.py'))

# mkdir data/{sketches, experiments}
# make data/octopus.db

print "Create Data Dirs"
mkpath(pjoin(dist_dir, 'data', 'sketches'))
mkpath(pjoin(dist_dir, 'data', 'experiments'))

server.createdb.createdb(pjoin(dist_dir, 'data'))

print ("Creating SSH Keys")
key = rsa.generate_private_key(
    backend=crypto_default_backend(),
    public_exponent=65537,
    key_size=2048
)
private_key = key.private_bytes(
    crypto_serialization.Encoding.PEM,
    crypto_serialization.PrivateFormat.TraditionalOpenSSL,
    crypto_serialization.NoEncryption())
public_key = key.public_key().public_bytes(
    crypto_serialization.Encoding.OpenSSH,
    crypto_serialization.PublicFormat.OpenSSH
)

with open(pjoin(dist_dir, 'data', 'ssh-keys', 'ssh_host_rsa_key.pub'), 'wb') as f:
    f.write(public_key)

with open(pjoin(dist_dir, 'data', 'ssh-keys', 'ssh_host_rsa_key'), 'wb') as f:
    f.write(private_key)

# del *.pyc

print "Remove *.pyc"
filelist = glob.glob(pjoin(dist_dir, '**', '*.pyc'))
for f in filelist:
    os.remove(f)

# Download Installers

if os.name == 'nt':
	print "Download Installers"
	os.chdir(dist_dir)
	wget.download("https://www.python.org/ftp/python/2.7.9/python-2.7.9.msi", out = "python-2.7.9.msi")
	wget.download("https://pypi.python.org/packages/2.7/T/Twisted/Twisted-14.0.2.win32-py2.7.msi#md5=e5f239987f3b5efbec41e6224bf982cb", out = "Twisted-14.0.2.win32-py2.7.msi")
	wget.download("http://sourceforge.net/projects/numpy/files/NumPy/1.9.1/numpy-1.9.1-win32-superpack-python2.7.exe/download", out = "numpy-1.9.1-win32-superpack-python2.7.exe")
	wget.download("https://pypi.python.org/packages/any/p/pyserial/pyserial-2.7.win32.exe#md5=21555387937eeb79126cde25abee4b35", out = "pyserial-2.7.win32.exe")
	wget.download("http://www.voidspace.org.uk/downloads/pycrypto26/pycrypto-2.6.win32-py2.7.exe", out = "pycrypto-2.6.win32-py2.7.exe")
	wget.download("https://pypi.python.org/packages/2.7/z/zope.interface/zope.interface-4.1.1.win32-py2.7.exe#md5=8b36e1fcd506ac9fb325ddf1c7238b07", out = "zope.interface-4.1.1.win32-py2.7.exe")
	wget.download("http://sourceforge.net/projects/pywin32/files/pywin32/Build%20219/pywin32-219.win32-py2.7.exe/download", out = "pywin32-219.win32-py2.7.exe")
