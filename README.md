# 使用DOM渲染瓦片

如果我们已经得到一个瓦片地图服务接口， 也就是说对于一个给定的x,y,z我们可以通过网络请求获得一张256px*256px的图片，如何将这些图片拼接在一起，构建一个地图浏览器，使得我们可以像在acrgis中一样， 通过平移，缩放来浏览地图。

在浏览器中操作图片， 一个比较直观的想法是使用img元素来显示图片， 然后通过一定的规则来拼接图片，实现地图浏览功能。

## 坐标系统

假设我们的地图大小是512px * 512px, 最少需要4张（如果有些图片只显示部分，则需要更多图片）256px * 256px的图片才可以铺满。
为了确定究竟用那些图片来拼接地图，需要了解一套坐标系统。


### 地理坐标系统

gps的流行，使得它所使用的地理坐标系统wgs84广泛流行。我们常说的东经114°北纬23°一般都假定是在wgs84下的坐标。但是地理坐标系统，是球面坐标系统，
经度是球上过地心和赤道面垂直的两个面的夹角， 纬度是过地心的线和赤道面的夹角。球面坐标系统的问题是，无法无变形的绘制在平面上，无论如何绘制，都会导致长度，面积，角度中的一种或多种发生变形，这是立体和平面的本质所决定的。

为了满足各种各样的地图使用需求， 各种各样的地图投影被设计出来， 如等角投影，等积投影等。

### 投影坐标系统

现在的网络地图最常用的投影是， 球面墨卡托投影， 它具有以下特点：

1. 等角投影， 投影前后角度不变
2. 在赤道上没有长度变形

根据这两个性质可以推导出投影公式。

整个地球的坐标范围是 [-πR， -πR] 到 [πR， πR]，其中R是球体的半径（半径是一个近似值）。

### 瓦片坐标系统

如果把 [-πR， -πR] 到 [πR， πR] 的一个平面，绘制在一张256px*256px的图片上， 那么1一个px代表的长度就是 2πR / 256。

这个值就是分辨率。

假设给定了一个投影坐标x,y 除以分辨率就可以得到这个坐标所落在的像元位置（一般，像元的原点在左上角，所以y值需要修改一下）。

同理， 假设， 把全球绘制在 4张256px * 256px的图片上， 那么1个px代表的长度就是 2πR / （2*256）,

假设给定一个投影坐标x，y 除以分辨率就可以得到这个坐标所落在的像元位置，假设再除以256，就可以知道，这个坐标是落在那个编号的瓦片上。

根据这个规则，只要我们知道了显示范围左上角和右下角的地理坐标， 通过函数投影变化为投影坐标后， 根据缩放级别，计算分辨率，然后计算像素坐标，
就可以得到左上角的瓦片编号和右下角的瓦片编号，就确定了要加载的瓦片范围。


### 浏览器坐标系

对于浏览器上的一个元素， 它的左上角的坐标是(0px,0px), 右下角的坐标则是(width px, height px)。为了在浏览器坐标和地理坐标之间建立一个桥梁，
一开始我们要给定元素中一个点的地理坐标（一般给定中心的地理坐标）， 为了在地理坐标和瓦片坐标之间建立一个桥梁，我们还要给定缩放等级。

根据浏览器中心的地理坐标， 经过投影， 可以得到浏览器中心的投影坐标， 根据缩放级别，经过变换可以得到浏览器中心的像素坐标， 因为像素坐标的大小和浏览器坐标的大小是一致的， 根据像素距离就可以得到元素中任意一点的像素坐标， 据此也可以反推得到，投影坐标和地理坐标。


至此，我们已经可以确定究竟需要加载那些瓦片了。然后根据瓦片，相对于元素左上角像素坐标的距离，将瓦片定位在相应的位置，即完成了瓦片的拼接。


## 平移

观察arcgis的平移操作， 所谓地图平移就是， 在窗口中拖动鼠标，然后窗口显示的内容向指定的方向移动。

很明显窗口本身是不移动的，移动的是底部的地图。

所以我们实际上应该在窗口元素下面，增加一个元素用来装载img元素， 然后再窗口上拖动时， 相应的移动底部元素。



## 缩放

缩放，就是改变瓦片的级别，改变瓦片的级别，导致像素坐标的位置改变了，进而导致原点的像素坐标改变，所以需要更新，元素左上角的像素坐标。



