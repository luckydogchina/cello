/*
	用于记录明细账本摘要信息的智能合约
	@author： wangzhipeng@whty.com.cn
	@date: 04/25/2018
*/

package main

import (
	"fmt"
	"log"
	"utils"
	pb "github.com/hyperledger/fabric/protos/peer"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	"encoding/json"
	"encoding/base64"
	"strconv"
)

var ParamNumError  =  "the paraments are not enough."
var ParamMatchdeError  =  "the paraments number are not matched."
var AdminError = "sorry, you do not have write privilege"

type Archives struct{

}

func (ar *Archives)Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil);
}

func (ar *Archives)registry(stub shim.ChaincodeStubInterface, args [][]byte)  pb.Response{
	var err error;
	if len(args) != 2{
		return shim.Error(ParamMatchdeError+": 2 paraments needed");
	}

	l := utils.Subledger{};
	if err = json.Unmarshal(args[1], &l);err != nil{
		return shim.Error(err.Error());
	}

	//判断ledgerId是否已经被注册
	lKey := base64.StdEncoding.EncodeToString([]byte(l.LedgerId));
	if value, err := stub.GetState(lKey); err != nil{
		return shim.Error(err.Error());
	}else if value != nil{
		return shim.Error(l.LedgerId + "had been registried, sorry.");
	}

	//将Owner强制设置为Creator
	if l.Owner, err = stub.GetCreator(); err != nil{
		return shim.Error(err.Error());
	}

	//如果Admin为空，就将Owner作为Admin
	if l.Admin == nil{
		l.Admin = l.Owner[:];
	}

	//将LedgerId的base64编码作为Key
	lValue, _ := json.Marshal(&l);
	if err = stub.PutState(lKey, lValue); err != nil{
		return shim.Error(err.Error());
	}

	return shim.Success(nil);
}

func blockNumberKey(ledgerIdBase64 string, blockNumber uint64) string {
	return fmt.Sprintf("%s~%x",ledgerIdBase64, blockNumber);
}

func (ar *Archives)record(stub shim.ChaincodeStubInterface, args [][]byte)  pb.Response{
	recordType := string(args[1]);
	switch recordType {
	case utils.Block_Header:
		{
			if len(args) != 4{
				return shim.Error(ParamMatchdeError+": 3 paraments needed");
			}

			lKey := base64.StdEncoding.EncodeToString(args[2]);
			lValue, err := stub.GetState(lKey);
			if  err != nil{
				return shim.Error(err.Error());
			}else if lValue == nil{
				return shim.Error("the Subledger " + string(args[2]) + " is not existing");
			}

			l := utils.Subledger{};
			if err = json.Unmarshal(lValue, &l); err != nil{
				return shim.Error(err.Error());
			}

			if creator, err := stub.GetCreator(); err != nil{
				return shim.Error(err.Error());
			}else if string(l.Admin) != string(creator) {
				return shim.Error(AdminError);
			}

			bh := utils.BlockHeader{};
			if err := json.Unmarshal(args[3] ,&bh); err != nil{
				return shim.Error(err.Error());
			}
			//TODO: 校验区块头数据信息

			//写入账本
			nKey := blockNumberKey(lKey, bh.Number);
			if err := stub.PutState(nKey, args[3]);err != nil{
				return shim.Error(err.Error());
			}

			return shim.Success(nil);
		}
	case utils.Block_Copy:
		//TODO 记录备份信息
		return shim.Success(nil);
	default:
		break;
	}

	return shim.Error("the type:" + recordType + " is not supported" );
}

func (ar *Archives)query(stub shim.ChaincodeStubInterface, args[][]byte)  pb.Response{
	queryType := string(args[1]);
	switch queryType {
	case utils.Block_Header:
		{
			if len(args) != 4{
				return shim.Error(ParamMatchdeError+": 3 paraments needed");
			}

			lKey := base64.StdEncoding.EncodeToString(args[2]);
			if lValue , err := stub.GetState(lKey); err != nil{
				return shim.Error(err.Error());
			} else if lValue == nil{
				return shim.Error("the Subledger " + string(args[2]) + " is not existing");
			}

			//此处不做权限判定
			blockNum, err :=  strconv.Atoi(string(args[3]));
			if err != nil{
				return shim.Error(err.Error());
			}
			blockNumKey := blockNumberKey(lKey, uint64(blockNum));
			blockNumValue, err := stub.GetState(blockNumKey);
			if  err != nil{
				return shim.Error(err.Error());
			} else if blockNumValue == nil{
				return shim.Error(fmt.Sprintf("the block num %d is not existing", blockNum))
			}

			return shim.Success(blockNumValue);
		}
	case utils.SubLedger_Info:
		{
			//TODO: 查询明细账本信息
			return shim.Success(nil)
		}
	case utils.Block_Copy:
		return shim.Success(nil);
	default:
		break;
	}

	return shim.Error("the type:" + queryType + " is not supported" );
}

func (ar *Archives)update(stub shim.ChaincodeStubInterface)  pb.Response{
	//TODO : 更新ledger配置信息
	return shim.Success(nil);
}

func (ar *Archives)Invoke(stub shim.ChaincodeStubInterface)  pb.Response {
	args := stub.GetArgs();
	if len(args) < 2 {
		return shim.Error(ParamNumError);
	}

	function := string(args[0]);
	switch function {
	case utils.Registry:
		return ar.registry(stub, args);
	case utils.Record:
		return ar.record(stub, args);
	case utils.Query:
		return ar.query(stub, args);
	case utils.Update:
		return ar.update(stub);
	}

	return shim.Error("the function:" + function+ "is not supported");
}

func main()  {
	err := shim.Start(new(Archives))
	if err != nil{
		log.Fatalf(err.Error());
	}
}


