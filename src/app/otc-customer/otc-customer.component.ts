import { Component } from '@angular/core';
import { DatePipe, DecimalPipe, NgForOf, NgIf } from '@angular/common';
import { FilterByStatusPipeModule } from '../orders/FilterByStatusPipe';
import { OrangeButtonModule } from '../welcome/redesign/OrangeButton';
import { TableComponentModule } from '../welcome/redesign/TableComponent';
import { TransformSecuritiesPipeModule } from '../orders/TransformSecuritiesPipe';
import {
  Contract, Customer, CustomerWithAccounts, Order,
  OTC,
  OTCTab, PublicCapitalDto,
  PublicOffer,
  StockListing, User,
} from '../model/model';
import { OtcService } from '../service/otc.service';
import { StockService } from '../service/stock.service';
import {forkJoin, Observable} from 'rxjs';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { TableComponentStatusModule } from '../welcome/redesign/TableComponentStatus';
import { PopupService } from '../service/popup.service';
import {CustomerService} from "../service/customer.service";
import {environment} from "../../environments/environment";
import {OrderService} from "../service/order.service";
import {TransformPublicSecuritiesPipeModule} from "../orders/TransformPublicSecuritiesPipe";
import {TransformContractsPipeModule} from "./TransformContractsPipe";
import {TransformStatusPipeModule} from "./TransformStatusPipe";
import {any, string} from "zod";

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
    TransformSecuritiesPipeModule,
    TableComponentStatusModule,
    TransformPublicSecuritiesPipeModule,
    TransformContractsPipeModule,
    TransformStatusPipeModule,
  ],
  templateUrl: './otc-customer.component.html',
  styleUrl: './otc-customer.component.css',
})
export class OtcCustomerComponent {
  headersOTCs = [
    'Buyer',
    'Seller',
    'Comment',
    'Created',
    'Realized',
    'Ticker',
    'Amount',
    'Price',
  ];

  headersPublic = [
    'Security',
    'Symbol',
    'Amount',
    'Last Modified',
    'Owner',
  ];

  selectedTab: string = 'public';
  otcToContractIdMap: Map<OTC, number> = new Map();
  contracts: Contract[] = [];
  stocks: StockListing[] = [];
  otcs: OTC[] = [];
  publicOffers: PublicOffer[] = [];
  publicSecurities: any[] = [];
  orders: Order[] = []; // Assuming you have a list of orders

  activeSell: Contract[] = [];
  activeBuy: Contract[] = []

  customer: CustomerWithAccounts = {} as CustomerWithAccounts;


  constructor(
    private otcService: OtcService,
    private customerService: CustomerService,
    private stockService: StockService,
    private http: HttpClient,
    private popup: PopupService,
    private orderService: OrderService
  ) {}

  async ngOnInit() {
    await this.loadOTCs();
    this.initializeCustomer();
    this.getPublicSecurities();
  }

  private initializeCustomer(): void {
    this.customerService.getCustomer2().subscribe({
      next: (customer) => {
        this.customer = customer;
        console.log('Customer:', customer);
        this.filterActiveSellContracts();
        this.filterActiveBuyContracts();
      },
      error: (err) => {
        console.error('Error fetching customer:', err);
      }
    });
  }

  filterActiveSellContracts(): void {
    if (!this.customer || !this.contracts) return;

    const accountNumbers = this.customer.accountIds.map(account => account.accountNumber);
    this.activeSell = this.contracts.filter(contract => accountNumbers.includes(contract.sellerAccountNumber));
    console.log('Active Sell Contracts:', this.activeSell);
  }

  filterActiveBuyContracts(): void {
    if (!this.customer || !this.contracts) return;

    const accountNumbers = this.customer.accountIds.map(account => account.accountNumber);
    this.activeBuy = this.contracts.filter(contract => accountNumbers.includes(contract.buyerAccountNumber));
    console.log('Active Buy Contracts:', this.activeBuy);
  }

  async loadOTCs() {
    this.otcService.getAllCustomerContracts().subscribe((contracts) => {
      this.contracts = contracts;
      console.log('Contacts: ', this.contracts);
    });
  }

  getPublicSecurities() {
    this.orderService.getPublicStocks().subscribe(res => {
      this.publicSecurities = res;
    })
  }

  togglePopupOffer(row: any) {
    this.popup.openPublicSecuritiesPopup(row);
  }

  setTab(tabName: string) {
    this.selectedTab = tabName;
  }

  updateOTCStatus(contract: any, newStatus: 'Approved' | 'Denied') {
    // if (contract.status === newStatus) return;
    console.log('Contract:', contract);
    // const contractId = this.otcToContractIdMap.get(contract);
    var contractId = contract.contractId;
    // console.log(contract);
    //
    // console.log('Contract ID:', contractId);

    if (contractId) {
      if (newStatus === 'Approved')
        this.otcService.approveOTC(contractId).subscribe(
          (response) => {
            console.log('Response to successfully changing status:' + response);
          },
          (error) => {
            console.error('Error updating status, this is response: ' + error);
          }
        );
      else
        this.otcService.denyOTC(contractId).subscribe(
          (response) => {
            console.log('Response to successfully changing status:' + response);
          },
          (error) => {
            console.error('Error updating status, this is response: ' + error);
          }
        );
    } else {
      console.error('Contract ID not found for OTC', contract);
    }
  }
}
