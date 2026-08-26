export const GOLDEN = {
	seedHex: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
	state0: {
		value: {
			regionId: "riverhold",
			revision: 0,
			runId: "run_fixture_0001",
			simulationTime: 0,
		},
		preimageHex:
			"454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a53544154453a7632000000537b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a302c2272756e4964223a2272756e5f666978747572655f30303031222c2273696d756c6174696f6e54696d65223a307d",
		hash: "ee03923beee017d3f6bbaecb8c26fb1b90be065089e34d14f406ebba452003ab",
	},
	state1: {
		value: {
			regionId: "riverhold",
			revision: 1,
			runId: "run_fixture_0001",
			simulationTime: 1,
		},
		hash: "38b5b59666b80577f37be07fd2742050813e0c643e83889fb1e40b7e7fb2e116",
	},
	payload: {
		value: { kind: "Observe", targetId: "citizen_mara" },
		preimageHex:
			"454f4e464f4c4b2d5455504c452d7632000000001a454f4e464f4c4b3a434f4d4d414e442d5041594c4f41443a76320000002c7b226b696e64223a224f627365727665222c227461726765744964223a22636974697a656e5f6d617261227d",
		hash: "29326f0ed2d90ae5c25db9db6d19f41075ab16958d745c2ffb314325c367b8df",
	},
	batchId: "batch_lzlrylnas74sxzj7rnryod2l3j2u2vw2uakazb2uideg6rcbcoqa",
	genesisHead:
		"01b9357332a4012f244688f1a6d2cb5d1ee7b791ff01eb4326c0d6dce496b982",
	eventHash: "8f50980c35611771cfd25cf08c3c725e4b057f2fe03ef31d9796745a972b4eaa",
	batchHash: "a6f087481198a8cd3aa19a4dca85bc80b446daa2bfb6549df8995afd0b4a02d8",
	stableCitizenId:
		"citizen_m4vq46wmgl36qgqreoahnrgwypbzfigrpx2whdm7avjrnegcnlna",
	prngSeedDigest:
		"0bed568abf8c04ba1b963bcaaaee97ef6f2ef58619f0d27864319cb7308e6582",
	prngInitialState: [0x8a56ed0b, 0xba048cbf, 0xca3b961b, 0xef97eeaa] as const,
	zeroReplacementOutputs: [
		"92dcf72a",
		"00544cb2",
		"046d0ff3",
		"7192e3d9",
		"ba2b8389",
		"12be2f0f",
	] as const,
} as const;
