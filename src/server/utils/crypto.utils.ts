import { randomBytes } from 'crypto';
import elliptic from "elliptic"
import { createHash } from "crypto"

export function createUniqueID ( length = 32 ) {
	// FIXME : Challenge randomness here, maybe use a specific approved package ?
	return randomBytes( length ).toString( 'hex' );
}

export function validateSignature ( signature:string, message:string, publicKey:string ) {
	const ec = new elliptic.ec('secp256k1')
	// Split signature
	const signatureParts = { r: signature.slice(0, 64), s: signature.slice(64, 128) };
	// Decode and process the provided public key
	const publicKeyHex = '04' + publicKey;
	const publicKeyObject = ec.keyFromPublic(publicKeyHex, 'hex');
	// Create message hash
	const messageHash = createHash('sha256').update(message).digest();
	// Verify the signature
	return publicKeyObject.verify( messageHash, signatureParts );
}