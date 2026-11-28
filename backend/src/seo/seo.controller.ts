import { Controller, Get, Res, Req } from '@nestjs/common';
import { SeoService } from './seo.service';
import { Response, Request } from 'express';

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.marjaah.shop').replace(/\/+$/, '');

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get(['sitemap.xml', 'api/sitemap.xml'])
  async getSitemapXml(@Req() req: Request, @Res() res: Response) {
    const baseUrl = PUBLIC_SITE_URL;

    const xml = await this.seoService.generateSitemapXml(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    return res.send(xml);
  }

  @Get(['robots.txt', 'api/robots.txt'])
  getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    const baseUrl = PUBLIC_SITE_URL;

    const txt = this.seoService.getRobotsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(txt);
  }
}
