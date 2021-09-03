 /* eslint-disable */ 
import React, {useState, useEffect} from "react";
import { Contract } from "@ethersproject/contracts";
import { getDefaultProvider } from "@ethersproject/providers";
import { useQuery } from "@apollo/react-hooks";

import { Body, Button, Header, Image, Link } from "./components";
import logo from "./ethereumLogo.png";
import useWeb3Modal from "./hooks/useWeb3Modal";
import Web3Modal from 'web3modal'

import { addresses, abis } from "@project/contracts";
import GET_TRANSFERS from "./graphql/subgraph";

import {ethers} from 'ethers'
import {condomAbi, lootAbi} from './abi'
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

async function readOnChainData() {
  // Should replace with the end-user wallet, e.g. Metamask
  const defaultProvider = getDefaultProvider();
  // Create an instance of an ethers.js Contract
  // Read more about ethers.js on https://docs.ethers.io/v5/api/contract/contract/
  const ceaErc20 = new Contract(addresses.ceaErc20, abis.erc20, defaultProvider);
  // A pre-defined address that owns some CEAERC20 tokens
  const tokenBalance = await ceaErc20.balanceOf("0x3f8CB69d9c0ED01923F11c829BaE4D9a4CB6c82C");
  console.log({ tokenBalance: tokenBalance.toString() });
}
const providerOptions={}

const web3Modal = new Web3Modal({
  network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions // required
});


function WalletButton({ provider, loadWeb3Modal, logoutOfWeb3Modal, setEthersProvider }) {
  return (
    <Button
      onClick={async () => {
        if (!provider) {
          loadWeb3Modal();
          // const provider = await web3Modal.connect()
          // setEthersProvider(provider)
        } else {
          logoutOfWeb3Modal();
        }
      }}
    >
      {!provider ? "Connect Wallet" : "Disconnect Wallet"}
    </Button>
  );
}

async function checkAvailableId(ethersProvider, contractAddress, startNumber, endNumber, setIds, setCheckIds){
  const lootContract=new ethers.Contract(contractAddress, lootAbi, ethersProvider.getSigner())
  const tokenIds=[]
  for(let i=startNumber; i<=endNumber; i++){
    try{
      let owned= await lootContract.ownerOf(i)
      setCheckIds(i)      
    }catch(e){
      console.log(i)
      tokenIds.push(i)
      setIds([...tokenIds])
    }

  }

}
async function buyToken(provider, contractAddress, tokenId, buyCommand){
  const lootContract=new ethers.Contract(contractAddress, lootAbi, provider.getSigner())
  if(contractAddress===ethers.constants.AddressZero){
    console.log('error')
    toast.error('error zero address')
    return
  }
  try{
    if(buyCommand==='claim'){
      const buyTx = await lootContract.claim(tokenId)
      toast.info(`sending ${buyTx.hash.substring(0,10)}...`)
      await buyTx.wait()
      toast.success(`success`)
    }else{
      const iface = new ethers.utils.Interface([`function ${buyCommand}(uint256 tokenId) payable`])
      const customContract = new ethers.Contract(contractAddress, iface, provider.getSigner())
      const buyTx =  await customContract[buyCommand](tokenId)
      toast.info(`sending ${buyTx.hash.substring(0,10)}...`)
      await buyTx.wait()
      toast.success(`success`)
    }
  }catch(e){
    toast.error(e)
  }
}
function AvaliableIds(props){
  const {tokenIds, provider, contractAddress, buyCommand} = props
  return(
    <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'10px'}}>
      {tokenIds.map(i=>{
        return(
            <Button onClick={()=>buyToken(provider, contractAddress, i, buyCommand)}>
              <div key={i} value={i}>
                  {i}
              </div>
            </Button>
        )
      })}
    </div>
  )
}

function App() {
  const { loading, error, data } = useQuery(GET_TRANSFERS);
  const [provider, loadWeb3Modal, logoutOfWeb3Modal] = useWeb3Modal();
  const [contractAddress, setContractAddress]=useState(ethers.constants.AddressZero)
  const [startNumber, setStartNumber]=useState(0)
  const [endNumber, setEndNumber]=useState(0)
  const [ids, setIds]=useState([])
  const [checkIds, setCheckIds]=useState(0)
  const [buyCommand, setBuyCommand]=useState('claim')
  const [condom, setCondom]=useState(false)
  const [disableInput, setDisableInput]=useState(true)



  useEffect(()=>{
    async function checkCondom(provider, setCondom){
      const condomContract=new ethers.Contract("0xD126E02Cf8b4559027F467ed5Ab697E78C4ec569", condomAbi, provider.getSigner())
      const signer=await provider.getSigner()
      const condomCount = await condomContract.balanceOf(await signer.getAddress())
      setCondom(condomCount >0 ? true:false)      
    }
    if (provider){
      console.log('checking condom')
      //Check condom balance
    
    checkCondom(provider, setCondom)
    }

  },[provider])
  
  if (provider && condom){
      return (
      <div>
          <Header>
          <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
        </Header>
        <Body>
          <h1>Loot Buyer</h1>        
        <div style={{display:'inline-flex'}}>          
          <span>Contract Address: </span>
          <input onChange={(e)=>setContractAddress(e.target.value)} style={{marginLeft:'15px', height:'25px', width:'500px'}}/>
        </div>
        <div style={{display:'inline-flex', marginTop:'25px'}}>
          <span>Start</span>
          <input onChange={(e)=>setStartNumber(e.target.value)} style={{marginLeft:'15px', width:'100px'}}/>
          <span>End</span>
          <input onChange={(e)=>setEndNumber(e.target.value)} style={{marginLeft:'15px', width:'100px'}}/>
        </div>        
        <div style={{marginTop:'25px'}}>
          <span>Custom buy command</span>
          <input disabled={disableInput} value={buyCommand} onChange={(e)=>setBuyCommand(e.target.value)} style={{marginLeft:'25px'}}/>
          <input type='checkbox' onChange={()=>setDisableInput(!disableInput)}/>
        </div>
        <Button onClick ={()=>checkAvailableId(provider, contractAddress, startNumber, endNumber, setIds, setCheckIds)} style={{marginTop:'25px'}}>Check</Button>
        <div>
          Checking {checkIds}
        </div>
        <AvaliableIds tokenIds={ids} contractAddress={contractAddress} provider={provider} buyCommand={buyCommand}/>
        </Body>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          />
      </div>
    )
  }else if(provider && !condom){
    return(
      <div>
        <Header>          
          <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
        </Header>
        <Body>
          <h1>No Condom</h1>  
          <div >
            Buy at Opensea <a href="https://opensea.io/collection/big-pp-condoms" rel="noopener noreferrer" target="_blank" style={{color:'white'}}>Link</a>
          </div>      
        </Body>
      </div>
    )
  }
  else{
    return(<div>        <Header>
      <WalletButton provider={provider} loadWeb3Modal={loadWeb3Modal} logoutOfWeb3Modal={logoutOfWeb3Modal} />
    </Header>
    <Body>connect wallet</Body></div>)
  }
  }

export default App;
