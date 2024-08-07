import { base, celo, gnosis, sepolia, baseGoerli, goerli, polygon, baseSepolia } from 'viem/chains';
import { http,  Chain, Hex, createClient } from "viem"
import {  ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07, UserOperation, bundlerActions, createBundlerClient} from 'permissionless';
import { createPimlicoPaymasterClient, createPimlicoBundlerClient  } from "permissionless/clients/pimlico";

/**
 * Retrieves the chain object based on the given chainId.
 * @param chainId - The ID of the chain.
 * @returns The chain object.
 */
export const getChain = (chainId: string) : Chain => {
  return [base, celo, gnosis, sepolia, baseGoerli, goerli, polygon, baseSepolia].find((chain: any) => chain.id == chainId) as Chain;
}

/**
 * Prepares the user operation for gas sponsorship and execution.
 * @param unsignedUserOp - The unsigned user operation.
 * @returns The sponsored user operation.
 */
export const sendUserOperation = async (chainId: string, unsignedUserOp: UserOperation<"v0.6">, userOpSigner: any ) => {

  const chain = getChain(chainId);

  const pimlicoEndpoint = `https://api.pimlico.io/v2/${chain.name.toLowerCase().replace(/\s+/g, '-')}/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`;

  // const pimlicoEndpoint = `https://api.developer.coinbase.com/rpc/v1/base-sepolia/RyVs19m25aXB97Noe8gU2FftEiRmQnID`;

  const rpcUrl = "https://api.developer.coinbase.com/rpc/v1/base-sepolia/RyVs19m25aXB97Noe8gU2FftEiRmQnID"

  
  const pimlicoBundlerClient = createPimlicoBundlerClient({ 
      transport: http(pimlicoEndpoint),
      entryPoint: ENTRYPOINT_ADDRESS_V06
    });

    

    const bundlerClient = createBundlerClient({
      chain: baseSepolia
      , transport: http(rpcUrl),
      entryPoint: ENTRYPOINT_ADDRESS_V06,
    })

  const paymasterClient = createPimlicoPaymasterClient({
    transport: http(chain == base ? pimlicoEndpoint : rpcUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V06,
  });


  const gasPrice = await pimlicoBundlerClient.getUserOperationGasPrice();


  unsignedUserOp.maxFeePerGas = gasPrice.fast.maxFeePerGas;
  unsignedUserOp.maxPriorityFeePerGas = gasPrice.fast.maxPriorityFeePerGas;

  console.log(unsignedUserOp)


  const sponsorUserOperationResult = await paymasterClient.sponsorUserOperation({
    userOperation: unsignedUserOp, 
  
  });

  const sponsoredUserOperation: UserOperation<"v0.6"> = {
    ...unsignedUserOp,
    ...sponsorUserOperationResult,
  };


  console.log(sponsoredUserOperation)

  sponsoredUserOperation.signature  = await userOpSigner(sponsoredUserOperation)

  const userOperationHash = await pimlicoBundlerClient.sendUserOperation({
      userOperation: sponsoredUserOperation,

  })

  console.log(userOperationHash)

  return userOperationHash;
}

export const waitForExecution = async (chainId: string, userOperationHash: string) => {

  const chain = getChain(chainId);

  const pimlicoEndpoint = `https://api.pimlico.io/v2/${chain.name.toLowerCase().replace(/\s+/g, '-')}/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`;


  const pimlicoBundlerClient = createPimlicoBundlerClient({ 
    transport: http(pimlicoEndpoint),
    entryPoint: ENTRYPOINT_ADDRESS_V07
  });


  const receipt = await pimlicoBundlerClient.waitForUserOperationReceipt({ hash: userOperationHash as Hex })

  return receipt;

}

