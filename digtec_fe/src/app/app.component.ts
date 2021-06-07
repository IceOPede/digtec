import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subscription } from 'rxjs';
import { delay, retryWhen, repeatWhen, tap} from 'rxjs/operators';
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

  public shouldPoll: boolean = false;

  private digtecPoller: Observable<any>;
  private digtecSubscription: Subscription;

  private delay = 30 * 1000;

  public productId: number

  constructor(private httpClient: HttpClient) { }

  ngOnInit(): void {
    moment.locale("de-ch");
    this.productId = 15950523
  }

  requestWithInterval() {
    this.shouldPoll = true;
    this.digtecPoller = this.callDigitec().pipe(tap(result => {
      this.startedLoading = false;

      if (result.status === "ERROR") {
        this.hasError = true;
        this.errorMessage = result.message;
        return of(result).toPromise();
      }

      this.hasError = false;
      this.errorMessage = "";

      this.lastResult = moment().format('L LTS')
      if (result.payload[0].price) {
        this.price = result.payload[0].price.amountIncl;
      } else {
        this.price = "Unavailable"
      }
      if (result.payload[0].canAddToBasket) {
        this.canAddToBasket = "yes";
      } else {
        this.canAddToBasket = "no"
      }
    }),
      repeatWhen(result => result.pipe(delay(this.delay), tap(() => this.startedLoading = true))),
      retryWhen(errors => errors.pipe(
        tap(error => {
          this.hasError = true;
          this.errorMessage = error.message;
        }), 
        delay(this.delay))));

    this.digtecSubscription = this.digtecPoller.subscribe();
  }

  stopPolling() {
    this.shouldPoll = false;
    this.digtecSubscription.unsubscribe()
  }

  callDigitec(): Observable<any> {
    this.startedLoading = true
    return this.httpClient.post("/fetchDigitecApi", {productData: {id: this.productId}})
  }
}