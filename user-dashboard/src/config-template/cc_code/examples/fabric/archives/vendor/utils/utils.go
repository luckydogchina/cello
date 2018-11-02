package utils

const (
	//注册明细账本信息
	Registry = "registry"
	//记录明细账本摘要信息，主要是区块头
	Record = "record"
	//浏览明细账本信息
	Query = "query"
	//更新明细账本权限配置
	Update = "update"

	//BlockHeader
	Block_Header = "blockHeader"

	//BlockCopy
	Block_Copy = "blockCopy"

	//Sub Ledeger Info
	SubLedger_Info = "subledgerinfo"
)

type Subledger struct {
	//明细账本的Id
	LedgerId string `json:"ledger_id"`
	//明细账本拥有者的公钥证书
	Owner	[]byte	`json:"owner"`
	//明细账本管理员证书,可以为nil，如果为nil则用owner代替
	Admin   []byte	`json:"admin"`
	//Tls服务的CA证书
	TlsCA   []byte	`json:"tls_ca"`
	//明细账本的地址
	Address string	`json:"address"`
}

// BlockHeader is the element of the block which forms the block chain
// The block header is hashed using the configured chain hashing algorithm
// over the ASN.1 encoding of the BlockHeader
type BlockHeader struct {
	Number       uint64 `json:"number"`
	PreviousHash []byte `json:"previous_hash"`
	DataHash     []byte `json:"data_hash"`
}

type BlockInfo struct {
	LedgerId string `json:"ledger_id"`
	Number uint64	`json:"number"`
}

type BlockCopy struct {
	//Block的信息
	Info BlockInfo `json:"info"`
	//Block备份的地址
	CopyAdrress []string `json:"copy_adrress"`
}

func ComputeEventName() string  {
	return "";
}
