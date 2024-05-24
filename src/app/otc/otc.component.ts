import { Component } from '@angular/core';
import {DatePipe, DecimalPipe, NgForOf, NgIf} from "@angular/common";
import {FilterByStatusPipeModule} from "../orders/FilterByStatusPipe";
import {OrangeButtonModule} from "../welcome/redesign/OrangeButton";
import {TableComponentModule} from "../welcome/redesign/TableComponent";
import {TransformSecuritiesPipeModule} from "../orders/TransformSecuritiesPipe";
import {Contract, OTC, StockListing} from "../model/model";
import {OtcService} from "../service/otc.service";
import {StockService} from "../service/stock.service";
import {forkJoin} from "rxjs";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-otc',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FilterByStatusPipeModule,
    NgForOf,
    NgIf,
    OrangeButtonModule,
    TableComponentModule,
    TransformSecuritiesPipeModule
  ],
  templateUrl: './otc.component.html',
  styleUrl: './otc.component.css'
})
export class OtcComponent {
  headersOTCs = ['Owner', 'Stock', 'Outstanding Shares', 'Exchange Name', 'Divided Yield'];
  selectedTab: "overview" = "overview";
  otcToContractIdMap: Map<OTC, number> = new Map();
  contracts: Contract[] = [];
  stocks: StockListing[] = [];
  otcs: OTC[] = [];

  constructor(private otcService: OtcService, private stockService: StockService, private http: HttpClient) {}

  async ngOnInit() {
    this.loadOTCs()
  }

  async loadOTCs(){
    // forkJoin({
    //   contracts: this.http.get<Contract[]>('/assets/mocked_banking_data/contracts-mocked.json'),
    //   stocks: this.http.get<StockListing[]>('/assets/mocked_banking_data/stocks-mocked.json')
    // }).subscribe(({ contracts, stocks }) => {
    //   console.log('Contracts:', contracts);
    //   console.log('Stocks:', stocks);
    //   this.contracts = contracts;
    //   this.stocks = stocks;
    //   this.otcs = this.mergeLists(contracts, stocks);
    //   console.log('OTCs:', this.otcs);
    // });

    forkJoin({
      contracts: this.otcService.getAllContracts(),
      stocks: this.stockService.getStocks()
    }).subscribe(({ contracts, stocks }) => {
      this.contracts = contracts;
      this.stocks = stocks;
      this.otcs = this.mergeLists(contracts, stocks);
      // console.log('Contracts:', contracts);
      // console.log('Stocks:', stocks);
      // console.log('OTCs:', this.otcs);
    });
  }

  updateOTCStatus(otc: any, newStatus: 'Approved' | 'Denied') {
    if(otc.status === newStatus)
      return;

    const contractId = this.otcToContractIdMap.get(otc);
    console.log('Contract ID:', contractId);

    if (contractId !== undefined) {
      if (newStatus === 'Approved')
         this.otcService.approveOTC(contractId).subscribe(
           response => {
             console.log('Response to successfully changing status:' + response);
           },
           error => {
             console.error('Error updating status, this is response: ' + error);
           });
      else
        this.otcService.denyOTC(contractId).subscribe(
          response => {
            console.log('Response to successfully changing status:' + response);
          },
          error => {
            console.error('Error updating status, this is response: ' + error);
          });

    } else {
      console.error('Contract ID not found for OTC', otc);
    }

    for(let current of this.otcs){
      if(current === otc){
        current.status = newStatus;
        break;
      }
    }
    // this loop above or this below
    // this.loadOTCs();
  }



  mergeLists(contracts: Contract[], stocks: StockListing[]): OTC[] {
    const stockMap = new Map<number, StockListing>();

    stocks.forEach(stock => {
      stockMap.set(stock.listingId, stock);
    });

    const result: OTC[] = [];

    contracts.forEach(contract => {
      const stock = stockMap.get(contract.listingId);
      if (stock) {
        const otc: OTC = {
          owner: contract.buyerAccountNumber,
          stock: stock.name,
          outstandingShares: stock.outstandingShares.toString(),
          exchangeName: stock.exchangeName,
          dividendYield: stock.dividendYield.toString(),
          status: contract.bankApproval ? 'Approved' : 'Pending'
        };
        result.push(otc);
        this.otcToContractIdMap.set(otc, contract.contractId);
      }
    });

    return result;
  }

}
