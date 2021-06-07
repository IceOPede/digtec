import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, repeat, delay } from 'rxjs/operators';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

  title = 'digitec';

  public price: any;
  public canAddToBasket: string;

  public startedLoading: boolean;
  public lastResult: string;

  public hasError: boolean;
  public errorMessage: string;

  constructor(private httpClient: HttpClient) { }

  ngOnInit(): void {
    moment.locale("de-ch");
  }

  requestWithInterval() {
    const source$ = this.callDigitec().pipe(switchMap(result => {

      this.startedLoading = false;

      if(result.status === "ERROR"){
        this.hasError = true;
        this.errorMessage = result.message;
        return of(result).toPromise();
      }

      this.hasError = false;
      this.errorMessage = "";

      this.lastResult = moment().format('L LTS')
      if(result.payload[0].price){
        this.price = result.payload[0].price.amountIncl;
      } else {
        this.price = "Unavailable"
      }
      if(result.payload[0].canAddToBasket){
        this.canAddToBasket = "yes";
      } else {
        this.canAddToBasket = "no"
      }
      return of(result).toPromise();
    }), delay(30*1000), repeat(-1));
    source$.subscribe(result => {
      this.startedLoading = true
    });

  }

  callDigitec(): Observable<any> {
    this.startedLoading = true
    return this.httpClient.get("/digitec")
  }
}
