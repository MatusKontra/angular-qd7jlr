import {
  Component,
  Input,
  Output,
  ViewChild,
  OnInit,
  EventEmitter,
  ViewEncapsulation,
  Self,
  Optional,
  OnDestroy
} from '@angular/core';
import { FormControl, NgControl, ControlValueAccessor } from '@angular/forms';
import { DateRangeTypesEnum } from '../../../BusinessModule/enums/date-range-types-enum';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';

export interface DateRangeModel {
  from: Date;
  to: Date;
  range: number;
}

import * as _moment from 'moment';
import { default as _rollupMoment } from 'moment';
import { combineLatest, Subscription } from 'rxjs';

const moment = _rollupMoment || _moment;

// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'YYYY/MM/DD'
  },
  display: {
    dateInput: 'YYYY/MM/DD',
    // needed for formatting date inside of datepicker popup.
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'YYYY'
  }
};

@Component({
  selector: 'dsg-input-daterange',
  templateUrl: './dsg-input-daterange.component.html',
  styleUrls: ['./dsg-input-daterange.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ]
})
export class DsgInputDaterangeComponent
  implements OnInit, ControlValueAccessor, OnDestroy {
  minDate: Date = null;
  maxDate: Date = null;

  @Input() dateFrom: Date = moment().toDate();
  @Input() dateTo: Date = moment().toDate();
  @Input() dateRangeTypes: { value: number; viewValue: string }[];
  @Input() dateRangeSelectedValue: number = -1;
  @Input() dateRangeToDisplayPickers: number = -1;

  public dateFromForm: FormControl = null;
  public dateToForm: FormControl = null;
  public dateRangeType: FormControl = null;

  // -------------- ?? Not needed now ?? ---------------------
  @Output('onDateRangeChanged') dateRangeChanged: EventEmitter<
    DateRangeModel
  > = new EventEmitter();
  //@Output('onDateToChanged') dateToChanged: EventEmitter<string> = new EventEmitter();

  //@ViewChild('dateFromInput', {static:false}) dateFromInput: any;
  //@ViewChild('dateToInput', {static:false}) dateToInput: any;

  protected valueChangeTimeout;
  rocsub: Subscription[] = [];
  eesub: Subscription;

  constructor(@Self() @Optional() private control: NgControl) {
    MY_FORMATS.parse.dateInput = 'MMM / DD';
    this.dateFromForm = new FormControl(this.dateFrom);
    this.dateToForm = new FormControl(this.dateTo);
    this.dateRangeType = new FormControl(this.dateRangeSelectedValue);
    if (this.control) {
      this.control.valueAccessor = this;
    }
  }

  writeValue(obj: any): void {
    this.dateRangeSelectedValue = obj && obj.rangeType;
    this.dateRangeType.setValue(obj && obj.rangeType);
    this.dateFrom = obj && obj.from;
    this.dateTo = obj && obj.to;

    this.setDatePickers();
  }
  registerOnChange(fn: any): void {
    this.rocsub.push(this.subToChanges(x => fn(x)));
  }
  private subToChanges(fn: any): Subscription {
    return combineLatest([
      this.dateFromForm.valueChanges,
      this.dateToForm.valueChanges,
      this.dateRangeType.valueChanges
    ]).subscribe(y =>
      fn({
        from: moment(y[0]).toDate(),
        to: moment(y[1]).toDate(),
        rangeType: y[2]
      })
    );
  }

  registerOnTouched(fn: any): void {}
  setDisabledState?(isDisabled: boolean): void {}

  ngOnInit(): void {
    this.dateFromForm.patchValue(this.dateFrom);
    this.dateToForm.patchValue(this.dateTo);
    this.dateRangeType.patchValue(this.dateRangeSelectedValue);

    this.eesub = this.subToChanges(y => this.dateRangeChanged.next(y));
  }

  ngOnDestroy(): void {
    for (const disp of this.rocsub) {
      disp.unsubscribe();
    }
    this.eesub && this.eesub.unsubscribe();
  }
  // picker need to be displayed:
  // 1. simple mode -> no dateRangeTypes supplied: allways
  // 2. combo mode  -> dateRangeTypes are supplied and dateRangeToDisplayPickers is selected.
  displayDatePickers(): boolean {
    return (
      !this.dateRangeTypes ||
      this.dateRangeTypes.length == 0 ||
      this.dateRangeType.value == this.dateRangeToDisplayPickers
    );
  }

  setDatePickers(): void {
    if (
      this.dateRangeType.value == DateRangeTypesEnum.Today ||
      this.dateRangeType.value == DateRangeTypesEnum.TodayAM ||
      this.dateRangeType.value == DateRangeTypesEnum.TodayPM
    ) {
      this.dateFrom = moment().toDate();
      this.dateTo = moment().toDate();
    } else if (this.dateRangeType.value == DateRangeTypesEnum.Yesterday) {
      this.dateFrom = moment()
        .add(-1, 'days')
        .toDate();
      this.dateTo = moment()
        .add(-1, 'days')
        .toDate();
    } else if (this.dateRangeType.value == DateRangeTypesEnum.Tomorrow) {
      this.dateFrom = moment()
        .add(1, 'days')
        .toDate();
      this.dateTo = moment()
        .add(1, 'days')
        .toDate();
    } else if (this.dateRangeType.value == DateRangeTypesEnum.ThisWeek) {
      var startOfWeek = moment().startOf('isoWeek'); //for month: .startOf('month')
      this.dateFrom = startOfWeek.toDate();
      var endOfWeek = moment().endOf('isoWeek');
      this.dateTo = endOfWeek.toDate();
    } else if (this.dateRangeType.value == DateRangeTypesEnum.LastWeek) {
      var startOfWeek = moment()
        .subtract(7, 'days')
        .startOf('isoWeek');
      this.dateFrom = startOfWeek.toDate();
      var endOfWeek = moment()
        .subtract(7, 'days')
        .endOf('isoWeek');
      this.dateTo = endOfWeek.toDate();
    }

    // why we need this? we already have formcontrol with our data and this will just remove all subs we had
    //this.dateFromForm = new FormControl(this.dateFrom);
    //this.dateToForm = new FormControl(this.dateTo);

    this.dateFromForm.setValue(this.dateFrom);
    this.dateToForm.setValue(this.dateTo);
  }

  public getStartDateString(): string {
    return moment(this.dateFromForm.value).format('YYYY-MM-DDTHH:mm:ss');
  }
  public getEndDateString(): string {
    return moment(this.dateToForm.value).format('YYYY-MM-DDTHH:mm:ss');
  }

  public getStartDate(): Date {
    return this.dateFromForm.value;
  }

  public getEndDate(): Date {
    return this.dateToForm.value;
  }

  public getDateRangeType(): number {
    return this.dateRangeType.value;
  }
}
