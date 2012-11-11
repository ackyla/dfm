# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'fb_graph'
require 'json'

class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
  end

  use Rack::Session::Cookie

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end

  get '/' do
    erb :index
  end

  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri(:scope => [:user_photos, :friends_photos])
  end

  get '/auth/callback' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    access_token = client.access_token! :client_auth_body
    session[:token] = access_token.access_token
    redirect '/edit'
  end
  
  get '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    friends = user.friends({"locale" => "ja_JP"})
    content_type :json
    friends.to_a.map{|friend|
      {
        "name" => friend.name, 
        "picture" => friend.picture({"&width=" => "34", "&height=" => "34"}),
        "absence" => friend.picture({"&width=" => "100", "&height=" => "120"})
      }
    }.to_json
  end

  get '/albums.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    tagged = user.photos({"type" => "tagged", "limit" => 1})[0].source
    albums = user.albums({"locale" => "ja_JP"})
    albums = albums.to_a.map{|album|
      {
        "id" => album.identifier,
        "name" => album.name,
        "source" => album.cover_photo.nil? ? nil : album.cover_photo.fetch(:access_token => session[:token]).source
      }
    }
    albums.unshift({"id" => 0, "name" => "あなたが写っている写真", "source" => tagged})
    content_type :json
    albums.to_json
  end

  get '/tagged_photos.json' do
    user = FbGraph::User.me(session[:token]).fetch({"locale" => "ja_JP"})
    photos = user.photos({"type" => "tagged"})
    photos = photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source
      }
    }
    content_type :json
    photos.to_json
  end

  get '/photos.json' do
    id = params[:id]
    album = FbGraph::Album.new(id, :access_token => session[:token]).fetch
    photos = album.photos.to_a.map{|photo|
      {
        "id" => photo.identifier,
        "name" => photo.name.nil? ? "無題" : photo.name,
        "source" => photo.source
      }
    }
    content_type :json
    photos.to_json
  end

  get '/edit' do
    erb :edit
  end

  post '/create' do
    content_type :json
    params[:absence].to_json
  end
end
