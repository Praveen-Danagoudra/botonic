import { ImageDelivery } from './image';
import { ScheduleDelivery } from './schedule';
import { KeywordsDelivery } from './keywords';
import { FollowUpDelivery } from './followUp';
import { CallbackMap, CallbackToContentWithKeywords } from '../cms';
import { ButtonDelivery } from './button';
import { DeliveryApi } from './deliveryApi';
import { CarouselDelivery } from './carousel';
import { TextDelivery } from './text';
import { UrlDelivery } from './url';
import * as cms from '../cms';
import * as time from '../time';

export default class Contentful implements cms.CMS {
  _carousel: CarouselDelivery;
  _text: TextDelivery;
  _url: UrlDelivery;
  _keywords: KeywordsDelivery;
  _schedule: ScheduleDelivery;
  _image: ImageDelivery;

  constructor(spaceId: string, accessToken: string, timeoutMs: number = 30000) {
    let delivery = new DeliveryApi(spaceId, accessToken, timeoutMs);
    let button = new ButtonDelivery(delivery);
    this._carousel = new CarouselDelivery(delivery, button);
    this._text = new TextDelivery(delivery, button);
    this._url = new UrlDelivery(delivery);
    this._image = new ImageDelivery(delivery);
    let followUp = new FollowUpDelivery(
      this._carousel,
      this._text,
      this._image
    );
    [this._text, this._url, this._carousel].forEach(d =>
      d.setFollowUp(followUp)
    );
    this._keywords = new KeywordsDelivery(delivery);
    this._schedule = new ScheduleDelivery(delivery);
  }

  async carousel(
    id: string,
    callbacks: cms.CallbackMap = new CallbackMap()
  ): Promise<cms.Carousel> {
    return this._carousel.carousel(id, callbacks);
  }

  async text(
    id: string,
    callbacks: cms.CallbackMap = new CallbackMap()
  ): Promise<cms.Text> {
    return this._text.text(id, callbacks);
  }

  async url(id: string): Promise<cms.Url> {
    return this._url.url(id);
  }

  async contentsWithKeywords(): Promise<CallbackToContentWithKeywords[]> {
    return this._keywords.contentsWithKeywords();
  }

  async schedule(id: string): Promise<time.Schedule> {
    return this._schedule.schedule(id);
  }

  image(id: string): Promise<cms.Image> {
    return this._image.image(id);
  }

  chitchat(id: string, callbacks: CallbackMap): Promise<cms.Chitchat> {
    return this._text.text(id, callbacks);
  }
}

export { DeliveryApi } from './deliveryApi';
export { CarouselDelivery } from './carousel';
export { ModelType } from '../cms';
