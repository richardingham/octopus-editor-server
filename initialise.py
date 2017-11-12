from __future__ import print_function

import os
from distutils.dir_util import mkpath

from cryptography.hazmat.primitives import serialization as crypto_serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend as crypto_default_backend

import server.createdb

pjoin = os.path.join
data_dir = pjoin(os.getcwd(), 'data')

print ("Creating Data Directories")
mkpath(pjoin(data_dir, 'sketches'))
mkpath(pjoin(data_dir, 'experiments'))
mkpath(pjoin(data_dir, 'ssh-keys'))

server.createdb.createdb(data_dir)

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

with open(pjoin(data_dir, 'ssh-keys', 'ssh_host_rsa_key.pub'), 'wb') as f:
    f.write(public_key)

with open(pjoin(data_dir, 'ssh-keys', 'ssh_host_rsa_key'), 'wb') as f:
    f.write(private_key)

print ("")
print ("Public SSH key is located at: " + pjoin(data_dir, 'ssh-keys', 'ssh_host_rsa_key.pub'))
print ("Use this key for SSH connections to the console.")
